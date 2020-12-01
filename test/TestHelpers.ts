import moment from 'moment';

export function sleep(ms: number): Promise<NodeJS.Timeout> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function genTimestampedName(name: string): string {
  return  name + '_' + moment().format('YYYYMMDD_HHmmssSSSS');
}