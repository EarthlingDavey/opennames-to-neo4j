const filters = async (object, returnProperty, options) => {
  const functionName = `${returnProperty}Filter`;

  if (options?.functions[functionName]) {
    object = await options?.functions[functionName](object, returnProperty);
  }

  return object[returnProperty];
};

export { filters };
