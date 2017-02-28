const csv = require('csvtojson')
const fs = require('fs')
const d3 = require('d3')

var subjects = [
  'Books',
  'Technology',
  'Supplies',
  'Trips',
  'Visitors',
  'Other'
]

var povertyLevels = [
  'low poverty',
  'moderate poverty',
  'high poverty',
  'highest poverty'
]

function csvToJson() {
  const csvFilePath = './data/newData.csv'
  var data = []
  csv()
  .fromFile(csvFilePath)
  .on('json',(jsonObj)=>{
    data.push(jsonObj)
  })
  .on('done',(error)=>{
    console.log('end')
    fs.writeFileSync('data/newData.json' , JSON.stringify(data, null, 4), 'utf8')
    cleanData()
  })
}

function cleanData() {
  fs.readFile('./data/newData.json', function(err, data) {
    var d = JSON.parse(data)

    d.forEach(function(o) {
      if(o.date == '2009') console.log(o)
      if(o.date_posted == '2009' && o.poverty_level == 'low poverty' && o.resource_type == 'Other')
        o.total_price_excluding_optional_support = 0

      o.price = +o.total_price_excluding_optional_support || 0
      delete o.total_price_excluding_optional_support
      o.poverty = o.poverty_level
      delete o.poverty_level
      o.date = +o.date_posted
      delete o.date_posted
      o.students = +o.students_reached || 0
      delete o.students_reached
      o.resource = o.resource_type || 'Other'
      delete o.resource_type
      delete o.row
      o.requests = +o.requests
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
      .key(function(d) { return d.resource })
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
          o.requests = o.values.reduce(function(acc,val) {
            return acc + val.requests
          }, 0)
        })

        psa.price = psa.values.reduce(function(acc,val) {
          return acc + val.price
        }, 0)
        psa.students = psa.values.reduce(function(acc,val) {
          return acc + val.students
        }, 0)
        psa.requests = psa.values.reduce(function(acc,val) {
          return acc + val.requests
        }, 0)

      })

      pvl.price = pvl.values.reduce(function(acc,val) {
        return acc + val.price
      }, 0)
      pvl.students = pvl.values.reduce(function(acc,val) {
        return acc + val.students
      }, 0)
      pvl.requests = pvl.values.reduce(function(acc,val) {
        return acc + val.requests
      }, 0)

    })

    var dataOut = []
    povertyLevels.forEach(function(level) {
      d.forEach(function(cohort) {
        if(cohort.key == level) dataOut.push(cohort)
      })
    })

    fs.writeFileSync('./data/newResult.json', JSON.stringify(dataOut, null, 2), 'UTF-8')
}

// cleanData()
csvToJson()

