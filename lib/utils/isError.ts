function isError(object: Error | any): object is Error {
  return !!(object as Error)?.message;
}

export default isError;
