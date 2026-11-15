import dayjs from './dayjs';

// MondaySys: our Press stores times in Asia/Dhaka (System Settings), not Asia/Calcutta as dayjsLocal ($dayjs) assumes.
export function serverTime(ts) {
	return dayjs.tz(ts, 'Asia/Dhaka').tz(dayjs.tz.guess());
}
