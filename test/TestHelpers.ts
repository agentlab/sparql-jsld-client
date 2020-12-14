import moment from 'moment';

export function genTimestampedName(name: string): string {
  return  name + '_' + moment().format('YYYYMMDD_HHmmssSSSS');
}