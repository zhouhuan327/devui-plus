export function getMaxTime(strs: Array<string | undefined>) {
  const milliseconds: number[] = [];
  strs.forEach((str) => {
    if (str) {
      const matchSeconds = str.match(/[0-9.]+(?=s)/g);
      if (matchSeconds) {
        milliseconds.push(...matchSeconds.map((second) => Number(second) * 1000));
      }

      const matchMilliseconds = str.match(/[0-9.]+(?=ms)/g);
      if (matchMilliseconds) {
        milliseconds.push(...matchMilliseconds.map((second) => Number(second)));
      }
    }
  });

  return milliseconds.sort().pop() ?? 0;
}
