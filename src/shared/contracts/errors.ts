// Implemented from ROUND3 Revision 1; no business routes or approval implied.

export interface PublicError {
  code: string;
  message: string;
  fieldErrors?: { field: string; message: string }[];
}

export interface Failure {
  ok: false;
  error: PublicError;
}
