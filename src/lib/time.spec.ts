import 'jest-extended'
import { format, subDays, startOfToday, addMinutes, subMinutes, startOfMinute } from 'date-fns'
import {
  getQueryDateRangeFrom,
  dateFromDateString,
  daysBeforeTs,
  getQueryDateTime,
  getDateRangeOfLastMinute
} from './time'

describe('time', () => {
  test('daysBeforeTs', () => {
    const today = startOfToday()

    expect(daysBeforeTs(1)).toMatchObject({
      fromTs: today.getTime() - 60000 * 60 * 24,
      toTs: today.getTime()
    })
  })

  test('getQueryDateTime', () => {
    expect(getQueryDateTime(Date.now()).toString()).toMatch(format(Date.now(), 'YYYY-MM-DD HH:mm:ss'))
  })

  test('getQueryDateRangeFrom(1)', () => {
    const today = startOfToday()

    expect(getQueryDateRangeFrom(1)).toMatchObject({
      to: format(today, 'YYYY-MM-DD'),
      from: format(subDays(today, 1), 'YYYY-MM-DD')
    })
  })

  test('getDateRangeOfLastMinute', () => {
    const timestamp = startOfMinute(Date.now() - 60000)
    const { from, to } = getDateRangeOfLastMinute(timestamp.getTime())

    expect(from.toString()).toBe(subMinutes(timestamp, 1).toString())
    expect(to.toString()).toBe(startOfMinute(timestamp).toString())
  })

  test('dateFromDateString', () => {
    const d = new Date('2020-04-25')

    expect(dateFromDateString('2020-04-25').toString()).toBe(addMinutes(d, d.getTimezoneOffset()).toString())
  })
})
