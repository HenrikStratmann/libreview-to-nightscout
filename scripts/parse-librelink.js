// Parse LibreLink CSV.
// Usage: 
//   TZ=Europe/Berlin DATA_CSV=../data/HenrikS_glucose_5-10-2022.csv UNIT=mg/dL node scripts/parse-librelink.js > data/libreview-parsed.json
// 

const fs = require('fs')
const path = require('path')

const csv = fs.readFileSync(path.join(__dirname, '/', process.env.DATA_CSV), { encoding: 'utf-8'})
const lines = csv.split('\n')
const title = lines[0]
const headings = lines[1].split(',')
const data = lines.slice(2)

switch(process.env.UNIT){
    case "mg/dL":
        FIELDS = {
            Device: headings.indexOf('Gerät'),
            SerialNumber: headings.indexOf('Seriennummer'),
            RecordType: headings.indexOf('Aufzeichnungstyp'),
            HistoricGlucose: headings.indexOf('Glukosewert-Verlauf mg/dL'),
            ScanGlucose: headings.indexOf('Glukose-Scan mg/dL'),
            DeviceTimestamp: headings.indexOf('Gerätezeitstempel'),
        }
        break
    case "mmol/L":
        FIELDS = {
            Device: headings.indexOf('Gerät'),
            SerialNumber: headings.indexOf('Seriennummer'),
            RecordType: headings.indexOf('Aufzeichnungstyp'),
            HistoricGlucose: headings.indexOf('Glukosewert-Verlauf mmol/L'),
            ScanGlucose: headings.indexOf('Glukose-Scan mmol/L'),
            DeviceTimestamp: headings.indexOf('Gerätezeitstempel'),
        }
        break
    default:
        throw new Error("Unit must be defined as mg/dL or mmol/L to parse glucose value.")
}


const RECORD_TYPE_ENUM = {
    HistoricGlucose: '0',
    ScanGlucose: '1'
}


const luxon = require('luxon')
const DateTime = luxon.DateTime

if(!process.env.TZ) throw new Error("TZ must be defined to parse the dates using the correct timezone.")
DateTime.defaultZoneName = process.env.TZ
const DATE_FORMAT = "dd-MM-yyyy hh:mm"

function convertMMolToMgDl(sgv) {
    return parseInt(sgv * 18.)
}

const res = data
.map(line => line.split(','))
.filter(fields => {
    return fields[FIELDS.RecordType] == RECORD_TYPE_ENUM.HistoricGlucose 
        || fields[FIELDS.RecordType] == RECORD_TYPE_ENUM.ScanGlucose
})
.map(fields => {
    let sgv

    const recordType = fields[FIELDS.RecordType]
    switch(recordType) {
        case RECORD_TYPE_ENUM.HistoricGlucose:
            sgv = fields[FIELDS.HistoricGlucose]
            break
        case RECORD_TYPE_ENUM.ScanGlucose:
            sgv = fields[FIELDS.ScanGlucose]
            break
        default:
            throw new Error(`Unexpected record type, ${recordType}`)
    }

    switch(process.env.UNIT){
        case "mg/dL":
            sgv = parseFloat(sgv)
            break
        case "mmol/L":
            sgv = convertMMolToMgDl(parseFloat(sgv))
            break
        default:
            throw new Error("Unit must be defined as mg/dL or mmol/L to parse glucose value.")
    }
    
    
    const deviceTimestamp = fields[FIELDS.DeviceTimestamp]
    const datetime = DateTime.fromFormat(deviceTimestamp, DATE_FORMAT)

    const record = {
        sgv,
        date: datetime.toMillis(),
        device: `${fields[FIELDS.Device]} | ${fields[FIELDS.SerialNumber]}`
    }

    return record
})


console.log(JSON.stringify(res))