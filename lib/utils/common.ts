export const callbackToPromise = async <T>(
  callback: (callback: (err: any, result: T) => void) => void,
) => {
  return await new Promise<T>((resolve, reject) => {
    callback((err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

export const noError = async (value: Promise<unknown>): Promise<boolean> => {
  return await value.then(() => true).catch(() => false);
};
