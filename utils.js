export const CLEAR = String.fromCharCode(27, 91, 72, 27, 91, 50, 74)

// Date time formatter
export const DTF = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium'
})
