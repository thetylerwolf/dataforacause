const csv = require('csvtojson')
const fs = require('fs')
const d3 = require('d3')

var subjects = [
  'Applied Learning',
  'Helth & Sports',
  'History & Civics',
  'Literacy & Language',
  'Math & Science',
  'Music & The Arts',
  'Special Needs'
]

var povertyLevels = [
  'low poverty',
  'moderate poverty',
  'high poverty',
  'highest poverty'
]

function csvToJson() {
  const csvFilePath = 'data/shortAggData.csv'
  var data = []

  csv()
  .fromFile(csvFilePath)
  .on('json',(jsonObj)=>{
    data.push(jsonObj)
    // combine csv header row and csv line to a json object
    // jsonObj.a ==> 1 or 4
  })
  .on('done',(error)=>{
    console.log('end')
    fs.writeFile('data/shortAggData.json' , JSON.stringify(data, null, 4), 'utf8')
  })
}

function cleanData() {
  fs.readFile('./data/shortAggData.json', function(err, data) {
    var d = JSON.parse(data)
    d.forEach(function(o) {
      o.price = +o.total_price_excluding_optional_support || 0
      delete o.total_price_excluding_optional_support
      o.poverty = o.poverty_level
      delete o.poverty_level
      o.date = +o.date_completed
      delete o.date_completed
      o.students = +o.students_reached || 0
      delete o.students_reached
      o.focus = o.primary_focus_area || 'Other'
      delete o.primary_focus_area
    })
    d.sort(function(a,b) {
      return a.date - b.date
    })
    groupData(d)
  })
}

function groupData(data) {
    var d = d3.nest()
      .key(function(d) { return d.poverty })
      .key(function(d) { return d.focus })
      // .key(function(d) { return new Date(d.date_completed).getFullYear() })
      .entries(data)

    d.forEach(function(pvl) {

      pvl.values.forEach(function(psa) {

        pvl.values.forEach(function(o) {

          o.price = o.values.reduce(function(acc,val) {
            return acc + val.price
          }, 0)
          o.students = o.values.reduce(function(acc,val) {
            return acc + val.students
          }, 0)
        })

        psa.price = psa.values.reduce(function(acc,val) {
          return acc + val.price
        }, 0)
        psa.students = psa.values.reduce(function(acc,val) {
          return acc + val.students
        }, 0)

      })

      pvl.price = pvl.values.reduce(function(acc,val) {
        return acc + val.price
      }, 0)
      pvl.students = pvl.values.reduce(function(acc,val) {
        return acc + val.students
      }, 0)

    })

    var dataOut = []
    povertyLevels.forEach(function(level) {
      d.forEach(function(cohort) {
        if(cohort.key == level) dataOut.push(cohort)
      })
    })

    fs.writeFileSync('./data/annualResult.json', JSON.stringify(dataOut, null, 2), 'UTF-8')
}

cleanData()
// csvToJson()

