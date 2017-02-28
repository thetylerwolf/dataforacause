import * as d3 from 'd3'
import Chart from './Chart'
// import data from './data/data-min.json'

const settings = {
  height: 500,
  width: 900,
  seriesPadding: 10,
  outerPadding: { top: 10, right: 56, bottom: 50, left: 10 }
}

d3.json('data/newResult.json', function(data) {
  var chart = new Chart('#chart', data, settings)
  chart.init()
})
