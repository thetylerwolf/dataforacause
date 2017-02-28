import * as d3 from 'd3'

export default class Chart {

  constructor(selector, data, settings) {
    this.selector = selector
    this.data = data
    this.settings = settings
    this.seriesByPoverty = {}
  }

  init() {
    this.svg = d3.select(this.selector)
    this.container = this.svg
      .append('g')
        .attr('class', 'container')
        // .attr('transform', `translate(0,${this.settings.height/2})`)

    this.initScales()
    this.drawLegend()
    this.draw()
    this.drawAxes()
    this.updateTooltip(this.povertySeries.length -1)
    this.addTooltipListener()

  }

  draw() {
    var container = this.container
    var povertyLevels = container.selectAll('g.pl-container').data(this.data)

    povertyLevels = povertyLevels.enter().append('g')
        .attr('class', d => `pl-container ${ d.key.split(' ').join('') }`)
        // .attr('transform', d => `translate(0,${ this.povertyScale(d.key) })`)
        // .attr('transform', d => `translate(0,${ this.settings.height/2 })`)
      .merge(povertyLevels)

    var area = d3.area()
      .x(d => this.timeScale(d.data.date))
      .y0((d,i) => {
        this.updatePovertyScale(d,i)
        var y = this.subjectScales[d.data.parent.key]( d[0] )
        return y
      })
      .y1(d => {
        var point = isNaN(d[1]) ? d[0] : d[1]
        var y = this.subjectScales[d.data.parent.key]( point )
        return y
      })

    var subjects = povertyLevels.selectAll('path').data(d => {

      var seriesData = d3.merge(d.values.map(d => d.values))

      seriesData = this.timeScale.domain().map(year => {
        var date = {
          date: year,
          total:0,
          totalStudents: 0,
          totalRequests: 0
        }
        seriesData.forEach(s => {
          if(s.date == year) {
            date[s.resource] = s['price']
            date.total += s['price']
            date.totalStudents += s['students']
            date.totalRequests += s['requests']
          }
        })
        date.parent = d
        return date
      })

      this.seriesByPoverty[d.key] = seriesData

      var stack = d3.stack().keys(this.colorScale.domain())
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone)

      var dataOut = stack(seriesData)

      return dataOut
    })

    this.buildPovertySeries()

    subjects.enter().append('path')
      .attr('d', area)
      .attr('class', d => d.key.split(' ').join(''))
      .style('fill', d => this.colorScale(d.key))
      // .style('stroke', d => this.colorScale(d.key))

  }

  initScales() {
    const settings = this.settings
    const timeDomain = d3.range(2002,2017)
    this.timeScale = d3.scaleOrdinal()
      .domain(timeDomain)
      .range(d3.range(0,timeDomain.length).map(d => settings.width * d/(timeDomain.length - 1 ) ) )

    this.povertyLevels = [
      'low poverty',
      'moderate poverty',
      'high poverty',
      'highest poverty'
    ].reverse()

    this.subjectScales = {}
    this.povertyLevels.forEach((pl) => {
      this.subjectScales[pl] = d3.scaleLinear()
    })

    var subjects = this.subjects = [
      'Books',
      'Technology',
      'Supplies',
      'Trips',
      'Visitors',
      'Other'
    ]
    this.colorScale = d3.scaleOrdinal(
      subjects.map((d,i) => d3.interpolateCool(0.25 + i/((subjects.length - 1) * 2)))
    ).domain(subjects)

  }

  drawAxes() {

    var svg = this.svg
    var timeAxis = d3.axisBottom(this.timeScale)
    svg.append('g')
      .attr('class', 'time-axis')
      .attr('transform', `translate(0, ${ this.settings.height })`)
      .call(timeAxis)

    var pvAxis = svg.append('g')
      .attr('class', 'pv-axis')
      .attr('transform', `translate(${ this.settings.width },0)`)

    pvAxis.append('text')
      .attr('transform', `translate(0,${ this.settings.height/2 }) rotate(90)`)
      .attr('text-anchor', 'middle')
      .attr('y', -45)
      .text('Ratio of Requests by Poverty Level')

    pvAxis.selectAll('text.pv-label').data(this.povertyLevels)
      .enter().append('text')
      .attr('class', 'pv-label')
      .attr('transform', d => `translate(5,${ this.subjectScales[d](0) }) rotate(90)`)
      // .attr('text-anchor', 'start')
      .text(d => d.split(' ')[0])

  }

  drawLegend() {
    var legendContainer = this.container.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${ this.settings.width },${ -this.settings.outerPadding.right + 10 })`)

    var legend = legendContainer.selectAll('g').data(this.subjects.slice(0).reverse())

    var legendEnter = legend.enter().append('g')

    legendEnter.append('rect')
      .attr('width', 13)
      .attr('height', 13)
      .attr('fill', d => this.colorScale(d))

    legendEnter.append('text')
      .attr('dy', 11)
      .attr('dx', 18)
      .attr('font-size', 12)
      .text(d => d)

    var prev = -10
    legendEnter
      .attr('transform', function(d,i) {
        var curr = prev + this.getBoundingClientRect().width + 10
        prev = curr
        return `translate(${ -curr },0)`
      })
  }

  buildPovertySeries() {
    var ps = this.seriesByPoverty
    var keys = Object.keys(ps)
    var seriez = []

    ps[keys[0]].forEach((d,i) => {
      var o = {}
      var t = 0
      keys.forEach(key => {
        o.date = ps[key][i].date
        o[key] = ps[key][i].total
        t += o[key]
      })
      o.total = t
      seriez.push(o)
    })

    var povertyMax = {value:0, i:0}
    seriez.forEach((d,i) => {
      if(d.total > povertyMax.value) povertyMax = { value: d.total, i: i }
    })

    this.povertyMax = d3.max(seriez, d => d.total)
    this.povertySeries = seriez
  }

  updatePovertyScale(data,i) {
    var key = data.data.parent.key

    var prevHeight = 0,
      valMax = this.povertyMax,
      dateProportion = this.povertySeries[i].total / valMax,
      chartHeight = this.settings.height - (3 * this.settings.seriesPadding),
      dateHeight = dateProportion * chartHeight,
      prevKey

    Object.keys(this.subjectScales).forEach((pl,idx) => {

      var sectionProportion = this.povertySeries[i][pl]/valMax
      // var lt5 = this.settings.height * sectionProportion < 5
      // var sectionHeight = Math.max(this.settings.height * sectionProportion, 5)
      // var sectionTop = -dateHeight/2 + prevHeight
      var sectionHeight = chartHeight * sectionProportion
      var sectionTop = this.settings.height - dateHeight + prevHeight
      var currTotal = this.povertySeries[i][pl]

      var range = [sectionTop, sectionTop + sectionHeight]
      var shift = (-3 + idx) * this.settings.seriesPadding
      range[0] += shift
      range[1] += shift

      this.subjectScales[pl]
        .domain([0, currTotal])
        .range(range)

      prevHeight += sectionHeight

    })
  }

  addTooltipListener() {
    this.svg.on('mousemove', d => {
      var bandWidth = this.settings.width/(this.timeScale.range().length - 1)
      var i = (d3.event.layerX - this.settings.outerPadding.left)/bandWidth
      var update = false

      if(i % 1 < 0.25) {
        i = Math.floor(i)
        update = true
      } else if (i % 1 > 0.75) {
        i = Math.ceil(i)
        update = true
      }
      if(i < 0) i = 0
      i = Math.min(this.timeScale.range().length - 1, i)
      if(update) this.updateTooltip(i, this.timeScale.range()[i])
    })
  }

  updateTooltip(idx, pos) {
    var tooltip = ''
    var date = this.povertySeries[idx].date
    // console.log(this.data)
    this.povertyLevels.forEach((pl,i) => {
      var dollarAmt = this.povertySeries[idx][pl]
      var percent = (100 * dollarAmt / this.povertySeries[idx].total).toFixed(0)
      var totalStudents = this.seriesByPoverty[pl][idx].totalStudents
      var totalRequests = this.seriesByPoverty[pl][idx].totalRequests
      var plLabel = pl.split(' ').map(d => d[0].toUpperCase() + d.slice(1)).join(' ')
      tooltip += `<div class="tooltip-title">${plLabel} - ${percent}%</div>`
        + `<div class="tooltip-content">${d3.format('$3,')(dollarAmt)} Requested</div>`
        + `<div class="tooltip-content">${d3.format('3,')(totalRequests)} Requests</div>`
        + `<div class="tooltip-content">> ${d3.format('3,')(totalStudents)} Students Reached</div>`
        + `<br>`
    })
    d3.select('#tooltip').html(tooltip)
    d3.select('#year').text(date)

    var line = this.container.selectAll('line').data([1])

    line.enter().append('line')
        .attr('x1', pos)
        .attr('x2', pos)
        .attr('y1', 0)
        .attr('y2', this.settings.height)
        .attr('stroke', '#fff')
        .attr('stroke-width', 3)
      .merge(line)
        .attr('x1', pos)
        .attr('x2', pos)

  }

}
