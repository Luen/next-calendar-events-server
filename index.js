const ical = require('node-ical')
const fs = require('fs')
const calendars = require('./parameters')

const SAVED_FILE = './dist/next-events.json'

const tzOffset = new Date().getTimezoneOffset() * 60 * 1000
const DAY = 24 * 60 * 60 * 1000
const now = Date.now()
const today = new Date()
today.setUTCHours(0)
today.setUTCMinutes(0)
today.setUTCSeconds(0)
const inFewDays = new Date(today.getTime() + DAY * 7)


function getEvents({ url, auth, calendar }) {
    return new Promise((resolve, reject) => {
        ical.async.fromURL(url,
            { headers: { 'Authorization': auth } },
            function (err, data) {
                if (err) reject(err)
                resolve({ calendar, data })
            })
    })
}


Promise.all(calendars.map(calendar => getEvents(calendar)))
    .then(datas => {
        const events = []
        datas.forEach(({ calendar, data }) => {
            Object.values(data).forEach(ev => {
                if (ev.type == 'VEVENT') {
                    const { summary, description, location, start, end } = ev
                    const dateStart = new Date(start)
                    const dateEnd = new Date(end)
                    dateStart.setTime(dateStart.getTime() - tzOffset)
                    dateEnd.setTime(dateEnd.getTime() - tzOffset)
                    if ((dateStart > today && dateEnd < inFewDays) || (dateStart < now && dateEnd > now) /* for events starting or ending in or a few days ago */) {
                        events.push({ calendar, dateStart, summary, description, location })

                    }
                }
            })
        })
        return events
    }).then(events => {
        fs.writeFile(SAVED_FILE, JSON.stringify(events), (err) => {
            if (err) {
                console.log(err)
                process.exit(err)
            }
            console.log(`${events.length} events saved in ${SAVED_FILE}`)
            process.exit(0)
        })
    }).catch(e => {
        console.error(e)
        process.exit(1)
    })
