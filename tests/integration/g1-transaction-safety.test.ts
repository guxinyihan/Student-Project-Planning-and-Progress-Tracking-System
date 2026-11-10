import { afterEach, describe, expect, it, vi } from 'vitest';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { asDependencyId, asProjectId, asRevision, asTaskId, asUserId } from '@group9/shared';
import type {
  DependencyRepository,
  ManagementRepository,
  SourceTransaction,
} from '../../src/backend/application/unit-of-work.js';
import { createSourceUnitOfWork } from '../../src/backend/persistence/source-unit-of-work.js';
import type { FoundationDatabase } from '../../src/backend/persistence/connection.js';
import { openFoundationDatabase } from '../../src/backend/persistence/connection.js';
import { relative } from 'node:path';
import {
  createSeededFoundationDatabase,
  foundationWorkspaceRoot,
} from '../fixtures/g1-database.js';
const opened: FoundationDatabase[] = [];
function fixture() {
  const db = createSeededFoundationDatabase();
  opened.push(db);
  return db;
}
function input(revision = 1) {
  return {
    verifiedActorId: asUserId('U1'),
    projectId: asProjectId('P1'),
    expectedRevision: asRevision(revision),
    authorize: () => {},
  };
}
const task = (id: string) => asTaskId(id);
function rows(db: FoundationDatabase) {
  return db.sqlite.prepare('SELECT task_id,name FROM tasks ORDER BY task_id').all();
}
function revisions(db: FoundationDatabase) {
  return db.sqlite.prepare('SELECT project_id,revision FROM projects ORDER BY project_id').all();
}
function link(id = 'L2', prerequisite = 'B', dependent = 'A') {
  return {
    dependencyId: asDependencyId(id),
    prerequisiteId: task(prerequisite),
    dependentId: task(dependent),
  };
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const db of opened.splice(0)) db.close();
});

describe('TX-01 transaction lifetime and async regression', () => {
  it('TX01-T01 rolls back immediate write and rejects late captured capability without unhandled rejection', async () => {
    const db = fixture();
    const before = rows(db);
    const beforeRev = revisions(db);
    let continuation: Promise<unknown> | undefined;
    let lateError: unknown;
    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', listener);
    try {
      expect(() =>
        createSourceUnitOfWork(db.sqlite).run(
          input(),
          // @ts-expect-error Intentionally bypass compile-time rejection to exercise runtime enforcement.
          (tx) => {
            tx.management.updateTaskName(task('A'), 'immediate');
            continuation = Promise.resolve().then(() => {
              try {
                tx.management.updateTaskName(task('B'), 'late');
              } catch (error) {
                lateError = error;
                throw error;
              }
            });
            return continuation;
          },
        ),
      ).toThrow('must be synchronous');
      // Deliberately do not attach a test rejection handler to continuation: adapter must consume it.
      await nextTurn();
      expect(lateError).toMatchObject({ code: 'TRANSACTION_CLOSED' });
      expect(continuation).toBeInstanceOf(Promise);
      expect(rows(db)).toEqual(before);
      expect(revisions(db)).toEqual(beforeRev);
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', listener);
    }
  });
  it('TX01-T02 retained management reference cannot write after a successful transaction', () => {
    const db = fixture();
    let retained: ManagementRepository | undefined;
    createSourceUnitOfWork(db.sqlite).run(input(), (tx) => {
      retained = tx.management;
      tx.management.updateTaskName(task('A'), 'committed');
    });
    const committed = rows(db);
    const revision = revisions(db);
    expect(() => retained!.updateTaskName(task('B'), 'late')).toThrow('inactive');
    expect(rows(db)).toEqual(committed);
    expect(revisions(db)).toEqual(revision);
  });
  it('TX01-T03 retained dependency repository cannot read or write after closure', () => {
    const db = fixture();
    let retained: DependencyRepository | undefined;
    createSourceUnitOfWork(db.sqlite).run(input(), (tx) => {
      retained = tx.dependencies;
      tx.management.updateTaskName(task('A'), 'committed');
    });
    expect(() => retained!.list()).toThrow('inactive');
    expect(() => retained!.add(link())).toThrow('inactive');
    expect(() => retained!.remove(asDependencyId('L1'))).toThrow('inactive');
    expect(db.sqlite.prepare('SELECT count(*) AS n FROM task_dependencies').get()).toEqual({
      n: 1,
    });
  });
  it('TX01-T04 thrown callback rolls back all writes and invalidates retained capability', () => {
    const db = fixture();
    const before = rows(db);
    let retained: ManagementRepository | undefined;
    expect(() =>
      createSourceUnitOfWork(db.sqlite).run(input(), (tx) => {
        retained = tx.management;
        tx.management.updateTaskName(task('A'), 'rollback');
        throw new Error('injected callback failure');
      }),
    ).toThrow('injected callback failure');
    expect(() => retained!.getTask(task('A'))).toThrow('inactive');
    expect(rows(db)).toEqual(before);
    expect(revisions(db)).toEqual([
      { project_id: 'P1', revision: 1 },
      { project_id: 'P2', revision: 1 },
    ]);
  });
  it('TX01-T05 custom PromiseLike assimilation sees inactive repositories and rejects safely', async () => {
    const db = fixture();
    const before = rows(db);
    let ran = false;
    let lateError: unknown;
    expect(() =>
      createSourceUnitOfWork(db.sqlite).run(
        input(),
        // @ts-expect-error Custom thenable passed as untyped input for runtime regression.
        (tx) => {
          tx.management.updateTaskName(task('A'), 'rollback');
          return {
            then(_resolve: (value: unknown) => void, reject: (reason: unknown) => void) {
              ran = true;
              try {
                tx.management.updateTaskName(task('B'), 'late');
              } catch (error) {
                lateError = error;
                reject(error);
              }
            },
          };
        },
      ),
    ).toThrow('must be synchronous');
    await nextTurn();
    expect(ran).toBe(true);
    expect(lateError).toMatchObject({ code: 'TRANSACTION_CLOSED' });
    expect(rows(db)).toEqual(before);
    expect(revisions(db)[0]).toEqual({ project_id: 'P1', revision: 1 });
  });
  it('TX01-T06 valid synchronous two-record operation increments exactly once', () => {
    const db = fixture();
    const result = createSourceUnitOfWork(db.sqlite).run(input(), (tx) => {
      tx.management.updateTaskName(task('A'), 'newA');
      return tx.management.updateTaskName(task('B'), 'newB');
    });
    expect(result.revision).toBe(2);
    expect(result.value.name).toBe('newB');
    expect(revisions(db)).toEqual([
      { project_id: 'P1', revision: 2 },
      { project_id: 'P2', revision: 1 },
    ]);
  });
  it('TX01-T07 commit exception invalidates capabilities and rolls source/revision back', () => {
    const db = fixture();
    const before = rows(db);
    let retained: ManagementRepository | undefined;
    const exec = db.sqlite.exec.bind(db.sqlite);
    vi.spyOn(db.sqlite, 'exec').mockImplementation((sql) => {
      if (sql === 'COMMIT') throw new Error('injected commit failure');
      return exec(sql);
    });
    expect(() =>
      createSourceUnitOfWork(db.sqlite).run(input(), (tx) => {
        retained = tx.management;
        tx.management.updateTaskName(task('A'), 'mustrollback');
      }),
    ).toThrow('injected commit failure');
    expect(() => retained!.getTask(task('A'))).toThrow('inactive');
    expect(rows(db)).toEqual(before);
    expect(revisions(db)[0]).toEqual({ project_id: 'P1', revision: 1 });
    expect(db.sqlite.inTransaction).toBe(false);
  });
  it('TX01-T07 rollback exception quarantines adapter and closes connection without reusable capabilities', () => {
    const db = fixture();
    const filename = db.filename;
    let retained: ManagementRepository | undefined;
    const unit = createSourceUnitOfWork(db.sqlite);
    const exec = db.sqlite.exec.bind(db.sqlite);
    vi.spyOn(db.sqlite, 'exec').mockImplementation((sql) => {
      if (sql === 'ROLLBACK') throw new Error('injected rollback failure');
      return exec(sql);
    });
    expect(() =>
      unit.run(input(), (tx) => {
        retained = tx.management;
        tx.management.updateTaskName(task('A'), 'mustrollback');
        throw new Error('injected callback failure');
      }),
    ).toThrow('connection quarantined');
    expect(() => retained!.getTask(task('A'))).toThrow('inactive');
    expect(db.sqlite.open).toBe(false);
    expect(() => unit.run(input(), () => undefined)).toThrow('unavailable');
    const reopened = openFoundationDatabase({
      workspaceRoot: foundationWorkspaceRoot,
      relativePath: relative(foundationWorkspaceRoot, filename),
      mode: 'open-owned',
    });
    opened.push(reopened);
    expect(reopened.sqlite.prepare("SELECT name FROM tasks WHERE task_id='A'").get()).toEqual({
      name: 'Synthetic A',
    });
    expect(revisions(reopened)[0]).toEqual({ project_id: 'P1', revision: 1 });
  });
});

describe('TX-01 adversarial thenable inspection', () => {
  it('TX01-T05 rejects a callable-then Proxy even when its has trap hides then', async () => {
    const db = fixture();
    const before = rows(db);
    const rev = revisions(db);
    let lateError: unknown;
    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', listener);
    try {
      expect(() =>
        createSourceUnitOfWork(db.sqlite).run(
          input(),
          // @ts-expect-error Runtime adversarial PromiseLike input is deliberately forced through.
          (tx) => {
            tx.management.updateTaskName(task('A'), 'rollback');
            const promise = Promise.resolve().then(() => {
              try {
                tx.management.updateTaskName(task('B'), 'late');
              } catch (error) {
                lateError = error;
                throw error;
              }
            });
            return new Proxy(promise, {
              has: () => false,
              get: (target, key) =>
                key === 'then' ? target.then.bind(target) : Reflect.get(target, key),
            });
          },
        ),
      ).toThrow('must be synchronous');
      await nextTurn();
      expect(lateError).toMatchObject({ code: 'TRANSACTION_CLOSED' });
      expect(rows(db)).toEqual(before);
      expect(revisions(db)).toEqual(rev);
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', listener);
    }
  });
  it('TX01-T05 invalidates before inspecting a throwing then getter and rolls back', () => {
    const db = fixture();
    const before = rows(db);
    let retained: ManagementRepository | undefined;
    expect(() =>
      createSourceUnitOfWork(db.sqlite).run(input(), (tx) => {
        retained = tx.management;
        tx.management.updateTaskName(task('A'), 'rollback');
        return Object.defineProperty({}, 'then', {
          get() {
            expect(() => tx.management.getTask(task('A'))).toThrow('inactive');
            throw new Error('injected then getter failure');
          },
        });
      }),
    ).toThrow('injected then getter failure');
    expect(() => retained!.getTask(task('A'))).toThrow('inactive');
    expect(rows(db)).toEqual(before);
    expect(revisions(db)[0]).toEqual({ project_id: 'P1', revision: 1 });
  });
});

describe('TX-02 scoped repositories with private coordinator control', () => {
  it('TX02-T01 P1 cannot modify a TaskId from P2; both projects unchanged', () => {
    const db = fixture();
    const before = rows(db);
    const rev = revisions(db);
    expect(() =>
      createSourceUnitOfWork(db.sqlite).run(input(), (tx) =>
        tx.management.updateTaskName(task('X'), 'forbidden'),
      ),
    ).toThrow('Invalid or inaccessible task');
    expect(rows(db)).toEqual(before);
    expect(revisions(db)).toEqual(rev);
  });
  it('TX02-T02 P1 cannot insert a dependency pointing at P2', () => {
    const db = fixture();
    const before = rows(db);
    expect(() =>
      createSourceUnitOfWork(db.sqlite).run(input(), (tx) =>
        tx.dependencies.add(link('L2', 'A', 'X')),
      ),
    ).toThrow('Invalid or inaccessible task');
    expect(rows(db)).toEqual(before);
    expect(revisions(db)).toEqual([
      { project_id: 'P1', revision: 1 },
      { project_id: 'P2', revision: 1 },
    ]);
    expect(db.sqlite.prepare('SELECT count(*) AS n FROM task_dependencies').get()).toEqual({
      n: 1,
    });
  });
  it('TX02-T03 API exposes only frozen management/dependency capabilities and plain DTO values', () => {
    const db = fixture();
    createSourceUnitOfWork(db.sqlite).run(input(), (tx) => {
      expect(Object.keys(tx)).toEqual(['management', 'dependencies']);
      expect(Object.keys(tx.management)).toEqual(['getTask', 'updateTaskName']);
      expect(Object.keys(tx.dependencies)).toEqual(['list', 'add', 'remove']);
      for (const object of [tx, tx.management, tx.dependencies]) {
        expect(Object.isFrozen(object)).toBe(true);
        for (const key of [
          'database',
          'sqlite',
          'orm',
          'prepare',
          'exec',
          'transaction',
          'commit',
          'rollback',
          'begin',
        ])
          expect(key in object).toBe(false);
      }
      const value = tx.management.updateTaskName(task('A'), 'plain');
      expect(Object.isFrozen(value)).toBe(true);
      expect(Object.values(value).every((v) => v === null || typeof v === 'string')).toBe(true);
    });
  });
  it('TX02-T04 independent COMMIT is inaccessible and attempted escape rolls back', () => {
    const db = fixture();
    const before = rows(db);
    expect(() =>
      createSourceUnitOfWork(db.sqlite).run(input(), (tx) => {
        tx.management.updateTaskName(task('A'), 'mustrollback');
        (tx as unknown as { exec(sql: string): void }).exec('COMMIT');
      }),
    ).toThrow();
    expect(rows(db)).toEqual(before);
    expect(revisions(db)[0]).toEqual({ project_id: 'P1', revision: 1 });
  });
  it('TX02-T05 multi-record mutation remains atomic, even if caller catches a repository denial', () => {
    const db = fixture();
    const before = rows(db);
    expect(() =>
      createSourceUnitOfWork(db.sqlite).run(input(), (tx) => {
        tx.management.updateTaskName(task('A'), 'mustrollback');
        try {
          tx.management.updateTaskName(task('X'), 'forbidden');
        } catch {
          /* cannot convert failed atomic mutation into success */
        }
      }),
    ).toThrow('Invalid or inaccessible task');
    expect(rows(db)).toEqual(before);
    expect(revisions(db)[0]).toEqual({ project_id: 'P1', revision: 1 });
  });
  it('TX02-T06 same-project cross-repository writes commit with exactly one revision', () => {
    const db = fixture();
    const result = createSourceUnitOfWork(db.sqlite).run(input(), (tx) => {
      tx.management.updateTaskName(task('A'), 'newA');
      tx.dependencies.remove(asDependencyId('L1'));
      return tx.dependencies.add(link('L2', 'A', 'B'));
    });
    expect(result.revision).toBe(2);
    expect(result.value).toEqual({
      dependencyId: 'L2',
      projectId: 'P1',
      prerequisiteId: 'A',
      dependentId: 'B',
    });
    expect(revisions(db)).toEqual([
      { project_id: 'P1', revision: 2 },
      { project_id: 'P2', revision: 1 },
    ]);
  });
  it('TX02-T07 alternate project fields and changing caller input cannot rebind scope', () => {
    const db = fixture();
    const original = input();
    expect(() =>
      createSourceUnitOfWork(db.sqlite).run(original, (tx) => {
        original.projectId = asProjectId('P2');
        return tx.dependencies.add({ ...link(), projectId: 'P2' } as Parameters<
          SourceTransaction['dependencies']['add']
        >[0]);
      }),
    ).toThrow('Unexpected dependency input field');
    expect(revisions(db)).toEqual([
      { project_id: 'P1', revision: 1 },
      { project_id: 'P2', revision: 1 },
    ]);
    const accepted = input();
    createSourceUnitOfWork(db.sqlite).run(accepted, (tx) => {
      accepted.projectId = asProjectId('P2');
      tx.management.updateTaskName(task('A'), 'scopedP1');
    });
    expect(revisions(db)).toEqual([
      { project_id: 'P1', revision: 2 },
      { project_id: 'P2', revision: 1 },
    ]);
  });
  it('TX02-T08 active membership and injected authorization rechecked before writes', () => {
    const db = fixture();
    const unit = createSourceUnitOfWork(db.sqlite);
    let ran = false;
    expect(() =>
      unit.run(
        {
          ...input(),
          authorize: () => {
            throw new Error('injected denial');
          },
        },
        () => {
          ran = true;
        },
      ),
    ).toThrow('injected denial');
    db.sqlite
      .prepare(
        "UPDATE project_members SET active=0,left_at='2026-10-30T01:00:00Z' WHERE member_id='M1'",
      )
      .run();
    expect(() =>
      unit.run(input(), () => {
        ran = true;
      }),
    ).toThrow('Invalid or inaccessible project');
    expect(ran).toBe(false);
    expect(revisions(db)[0]).toEqual({ project_id: 'P1', revision: 1 });
  });
});
