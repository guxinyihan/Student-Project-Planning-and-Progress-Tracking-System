import type {
  SourceUnitOfWork,
  SourceTransactionInput,
} from '../../src/backend/application/unit-of-work.js';
export function transactionCompileAssertions(
  unit: SourceUnitOfWork,
  input: SourceTransactionInput,
): void {
  unit.run(input, (tx) => {
    tx.dependencies.list();
    // @ts-expect-error No arbitrary SQL escape in the application transaction port.
    tx.prepare('COMMIT');
    // @ts-expect-error No public commit capability.
    tx.commit();
  });
  // @ts-expect-error Async work is excluded at compile time; runtime checks also enforce it.
  unit.run(input, async () => 'forbidden');
  // @ts-expect-error A non-async wrapper returning a Promise is also excluded.
  unit.run(input, () => Promise.resolve('forbidden'));
  // @ts-expect-error PromiseLike-returning callbacks are excluded too.
  unit.run(input, () => ({
    then: Promise.resolve('forbidden').then.bind(Promise.resolve('forbidden')),
  }));
}
