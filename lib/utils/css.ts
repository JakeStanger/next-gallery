export const css = (...classes: any[]): string => classes.filter((c) => c).join(' ');
