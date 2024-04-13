// We define a variable holding the current key to visualize on the map.
// var datasets0 = ['DAILY_CASES',
//  'DAILY_DIED',
//  'DAILY_RECOVERED',
//  'ASYMPTOMATIC',
//  'MILD',
//  'CRITICAL',
//  'SEVERE', 
//  'TOT_CASES',  
//  'TOT_DIED',
//  'TOT_RECOVERED', 
//  ]

 var datasets = ['DAILY CASES',
 'DAILY DEATHS',
 'DAILY RECOVERIES',
 'ASYMPTOMATIC',
 'MILD',
 'CRITICAL',
 'SEVERE', 
 'TOTAL CASES',  
 'TOTAL DIED',
 'TOTAL RECOVERIES', 
 ]


var varList = ['CASES PER 100K POP', 'CASES']


function convertToVar(VAR) {

    var ANS
    if (VAR == 'CASES PER 100K POP' || VAR.includes('_per_100kpop')==true) {
        ANS = '_per_100kpop'
    }


    if (VAR == 'CASES' || VAR == "" ) {
        ANS = "" // crucial!!!!!!!
    }



    return ANS
}

function convertToColumnName(KEY, VAR) {

    var KEY_NEW = KEY
    if (KEY_NEW.includes('NUM_')==false){

        KEY_NEW = 'NUM_' + KEY_NEW
      }

    if (VAR !='_per_100kpop' && KEY_NEW.includes('_per_100kpop')==false){

        KEY_NEW = KEY_NEW.replace('_per_100kpop','')

    }
    if (VAR == "_per_100kpop" && KEY_NEW.includes('_per_100kpop')==false) { 

        KEY_NEW = KEY_NEW + VAR

    }
    if (VAR != "_per_100kpop" && KEY_NEW.includes('_per_100kpop')==true) { 

        KEY_NEW = KEY_NEW.replace('_per_100kpop','')

    }
    // if (VAR == "_per_100kpop" && KEY_NEW.includes('_per_100kpop')==true) { 

    //     KEY_NEW = KEY_NEW

    // }    

    return KEY_NEW.replace(' ','_').replace('RECOVERIES','RECOVERED').replace('DEATHS','DIED').replace('TOTAL','TOT')
}

function convertToFileName(KEY) {

    return KEY.replace('NUM_','').replace('_per_100kpop','').replace(' ','_').replace('RECOVERIES','RECOVERED').replace('DEATHS','DIED').replace('TOTAL','TOT')
}


function convertToText(KEY) {

ANS = KEY.replace("_"," ").replace('RECOVERED','RECOVERIES').replace('DIED','DEATHS').replace('TOT','TOTAL').replace('NUM ','').replace("DAILY_","DAILY ").replace("TOTAL_","TOTAL ") // fix this later
if (KEY.includes('_per_100kpop')==true) {

    ANS = ANS.replace('_per_100kpop', ' PER 100K POP')

}

return ANS

}


var currentVar = convertToVar('CASES PER 100K POP')
var currentKey = convertToColumnName('DAILY CASES', currentVar)
console.log(currentKey)


///////////////
d3.select("#factorButton")
  .selectAll("myOptions")
  .data(varList)
  .enter()
  .append('option')
  .text(function (d) { return d; }) // text showed in the menu
  // .attr("value", function (d) { return d; }) // corresponding value returned by the button
  .attr("value", function(d){ return d })
///////////////


///////////////
d3.select("#selectButton")
  .selectAll("myOptions")
  .data(datasets)
  .enter()
  .append('option')
  .text(function (d) { return d; }) // text showed in the menu
  // .attr("value", function (d) { return d; }) // corresponding value returned by the button
  .attr("value", function(d){ return d })
///////////////





///////////////

// A "listener" is added to the browser window; updateLegend is called when
// the window is resized.
window.onresize = updateLegend;

// The dimensions for the map container are specified. The same
// width and height are used (as specified in the CSS above).
var width = 900,
    height = 250;

// A variable mapData is defined to hold the data of the CSV later.
var mapData;

// Get and prepare the Mustache template; parsing the template speeds up future uses
var template = d3.select('#template').html();
Mustache.parse(template);

// An SVG element is created in the map container and provided it with
// dimensions. A viewbox is then used; preserve the aspect ratio. This yields
// a responsive map that rescales and "adapts" with different screen sizes.
var svg = d3.select('#map').append('svg')
  .attr("preserveAspectRatio", "xMidYMid")
  .attr("viewBox", "0 0 " + width + " " + height);

// Add a <g> element to the SVG element and give it a class to
// style. We also add a class name for Colorbrewer.
var mapFeatures = svg.append('g')
  .attr('class', 'features YlGnBu');

// Add a <div> container for the tooltip, which is hidden by default.
var tooltip = d3.select("#map")
  .append("div")
  .attr("class", "tooltip hidden");

// Define the zoom and attach it to the map
var zoom = d3.behavior.zoom()
  .scaleExtent([0.5,60]) //[1, 10])
  .on('zoom', doZoom);
svg.call(zoom);

// Define a geographical projection
//     https://github.com/mbostock/d3/wiki/Geo-Projections
// and set some dummy initial scale. The correct scale, center and
// translate parameters will be set once the features are loaded.
var projection = d3.geo.mercator()
  .scale(1);

// Prepare a path object and apply the projections to it.
var path = d3.geo.path()
  .projection(projection);

// Prepare an object to have easier access to the data.
var dataById = d3.map();

// Prepare a quantized scale to categorize the values in 9 groups.
// The scale returns text values which can be used for the color CSS
// classes (q0-9, q1-9 ... q8-9). The domain will be defined once the
// values are known.
var quantize = d3.scale.quantize()
  .range(d3.range(8).map(function(i) { return 'q' + i + '-9'})); // 9 scales
  // ^ only VALID TILL 9 TIERS FOR YlGnBu

  // .range(d3.range(11).map(function(i) { console.log('q' + i + '-9'); return 'q' + i + '-9'})); // 9 scales


// Prepare a number format which will always return 2 decimal places.
var formatNumber = d3.format('.2f');

// console.log(toString(1.00).size())

// For the legend, we prepare a very simple linear scale. Domain and
// range will be set later as they depend on the data currently shown.
// var legendX = d3.scale.linear();
var legendX = d3.scale.linear();

// Use the scale to define an axis. The tickvalues will be set later
// as they also depend on the data.
var legendXAxis = d3.svg.axis()
  .scale(legendX)
  .orient("bottom")
  .tickSize(13)
  .tickFormat(function(d) {
    return formatNumber(d);
  });

// Create an SVG element in the legend container and give it some
// dimensions.
var legendSvg = d3.select('#legend').append('svg')
  .attr('width', '100%')
  .attr('height', '44');

// To this SVG element, add a <g> element which will hold all of our
// legend entries.
var g = legendSvg.append('g')
    .attr("class", "legend-key YlGnBu")
    .attr("transform", "translate(" + 20 + "," + 20 + ")");

// Add a <rect> element for each quantize category. The width and
// color of the rectangles will be set later.
g.selectAll("rect")
    .data(quantize.range().map(function(d) {
      return quantize.invertExtent(d);
    }))
  .enter().append("rect");

// Add a <text> element acting as the caption of the legend. The text
// will be set later.
g.append("text")
    .attr("class", "caption")
    .attr("y", -6)

// console.log(getIdOfFeature)

/**
 * Function to update the legend.
 * Loosely based on http://bl.ocks.org/mbostock/4573883
 */
function updateLegend() {

  // Determine the width of the legend. It is based on the width of
  // the map minus some spacing left and right.
  var legendWidth = d3.select('#map').node().getBoundingClientRect().width - 50;

  // Determine the domain of the quantize scale which will be used as
  // tick values. We cannot directly use the scale via quantize.scale()
  // because this returns only the minimum and maximum values but we need all
  // the steps of the scale. The range() function returns all categories
  // and we need to map the category values (q0-9, ..., q8-9) to the
  // number values. To do this, we can use invertExtent().
  var legendDomain = quantize.range().map(function(d) {
    var r = quantize.invertExtent(d);
    return r[1];
  });
  // Since we always only took the upper limit of the category, we also
  // need to add the lower limit of the very first category to the top
  // of the domain.
  legendDomain.unshift(quantize.domain()[0]);

  // On smaller screens, there is not enough room to show all 10
  // category values. In this case, we add a filter leaving only every
  // third value of the domain.
  if (legendWidth < 400) {
    legendDomain = legendDomain.filter(function(d, i) {
      return i % 3 == 0;
    });
  }

  // Set the domain and range for the x scale of the legend. The
  // domain is the same as for the quantize scale and the range takes up
  // all the space available to draw the legend.
  legendX
    .domain(quantize.domain())
    .range([0, legendWidth]);

  // Update the rectangles by (re)defining their position and width
  // (both based on the legend scale) and setting the correct class.
  g.selectAll("rect")
    .data(quantize.range().map(function(d) {
      return quantize.invertExtent(d);
    }))
    .attr("height", 8)
    .attr("x", function(d) { return legendX(d[0]); })
    .attr("width", function(d) { return legendX(d[1]) - legendX(d[0]); })
    .attr('class', function(d, i) {
      return quantize.range()[i];
    });

  // Update the legend caption. To do this, we take the text of the
  // currently selected dropdown option.
  // var keyDropdown = d3.select('#select-key').node();
  // var selectedOption = keyDropdown.options[keyDropdown.selectedIndex];
  formatDate = d3.time.format("%d %b %Y")
  // console.log(currentKey + ' (  latest count as of  ' + formatDate(lrangx[1]) + ')')
  


  ///////
  /// LEGEND TEXT
  ///////
  ////// 
  // var textL = currentKey// .replace('TOT','TOTAL').replace('RECOVERED','RECOVERIES').replace('DIED','DEATHS').replace('NUM_','').replace('_',' ');
  console.log(currentKey)
  console.log(currentVar)



  g.selectAll('text.caption')
   .text(convertToText(currentKey)); // + '  (latest value)');
    // .text(selectedOption.text);

  // We set the calculated domain as tickValues for the legend axis.
  legendXAxis
    .tickValues(legendDomain)

  // We call the axis to draw the axis.
  g.call(legendXAxis);
}

// Load the features from the GeoJSON.
// Load the file corresponding to the Philippine regions.
d3.json('data/Regions-p1p2p3.json', function(error, features) {

  // Get the scale and center parameters from the features.
  var scaleCenter = calculateScaleCenter(features);

  // Apply scale, center and translate parameters.
  projection.scale(scaleCenter.scale)
    .center(scaleCenter.center)
    .translate([width/2, height/2]);

  // Read the data for the cartogram
  // d3.csv('data/sample_data_ph.csv', function(data) {
  // d3.csv('data/covid19ph/LATEST_daily_and_movAve_ph_covid19_stats_forDashboards_nWindow=7.csv', function(data) {    
  d3.csv('data/covid19ph/combi_LATEST_daily_and_movAve_ph_covid19_stats_forDashboards_nWindow=7.csv', function(data) {

    // We store the data object in the variable which is accessible from
    // outside of this function..csv

    // We add the features to the <g> element created before.
    // D3 wants us to select the (non-existing) path objects first ...

    function Xupdate() {

    mapData = data;

    // This maps the data of the CSV so it can be easily accessed by
    // the ID of the municipality, for example: dataById[2196]
    dataById = d3.nest()
      // .key(function(d) { return d.REGION; })
      .key(function(d) { return d.REGION_L; })
      .rollup(function(d) { return d[0]; }) 
      .map(data);
    console.log(dataById)
    console.log(currentKey)
        
    mapFeatures.selectAll('path')
        // ... and then enter the data. For each feature, a <path>
        // element is added.
        .data(features.features)
      .enter().append('path')
        // As "d" attribute, we set the path of the feature.
        .attr('d', path)
        // When the mouse moves over a feature, show the tooltip.
        .on('mousemove', showTooltip)
        // When the mouse moves out of a feature, hide the tooltip.
        .on('mouseout', hideTooltip)
        // When a feature is clicked, show the details of it.
        .on('click', plotF); // , showDetails);
        /// dito mo idadagdag yung plot...
        // .on('click', showDetails);
    // Call the function to update the map colors.
    updateMapColors();


    }



    Xupdate()






    d3.select("#selectButton").on("change", function(d) {
        // recover the option that has been chosen

        // currentKey = 'NUM_' + d3.select(this).property("value") + cVar
        currentKey = d3.select(this).property("value")
        // var cVar = currentVar

        console.log(currentKey)
        console.log(currentVar)
        

        // function convertToVar(VAR) {

        //     var ANS = null
        //     if (VAR == 'CASES PER 100K POP') {
        //         ANS = '_per_100kpop'
        //     }
        //     if (VAR == 'CASES') {
        //         ANS = ""
        //     }
        //     return ANS
        // }

        // function convertToColumnName(KEY, VAR) {

        //     var KEY_NEW = 'NUM_' + KEY + VAR
        //     if( VAR != "_per_100kpop" ) { // meaning it's actual cases (so "")

        //         KEY_NEW = 'NUM_' + KEY

        //     }
        //     return KEY_NEW.replace(' ','_').replace('RECOVERIES','RECOVERED').replace('DEATHS','DIED').replace('TOTAL','TOT')
        // }

        currentVar = convertToVar(currentVar)
        // if( cVar != '_per_100kpop'){
        //     cVar = ""
        // }
        // if( cVar != ""){
        //     cVar = '_per_100kpop'
        // }        


        currentKey = convertToColumnName(currentKey, currentVar)

        // if( cVar != '_per_100kpop'){

        //     currentKey = 'NUM_' + d3.select(this).property("value");

        // }
        // run the updateChart function with this selected option
        // updateMapColors()

        console.log(currentVar)
        console.log(currentKey)

        Xupdate()
        
    })




    d3.select("#factorButton").on("change", function(q) {
        // recover the option that has been chosen

        currentVar = d3.select(this).property("value")
        // run the updateChart function with this selected option
        // updateMapColors()
        console.log(currentVar)


        currentVar = convertToVar(currentVar)
        console.log(currentVar)

        // if( cVar != '_per_100kpop'){

        //     cVar = "";

        // }
        console.log(currentKey)
        currentKey = convertToColumnName(currentKey, currentVar)
     
        // function revertCol(KEY) {
        // if(KEY.includes('_per_100kpop')==false){ // time to add '_per_100kpop' at the end



        // currentKey = revertCol(currentKey)
         
        console.log(currentKey)
        // console.log(cVar)

        Xupdate()
        
    })        



  });



});



/**
 * Update the colors of the features on the map. Each feature is given a
 * CSS class based on its value.
 */
function updateMapColors() {
  // Set the domain of the values (the minimum and maximum values of
  // all values of the current key) to the quantize scale.
  quantize.domain([
    d3.min(mapData, function(d) { return getValueOfData(d); }),
    d3.max(mapData, function(d) { return getValueOfData(d); })
  ]);
  // Update the class (determining the color) of the features.
  mapFeatures.selectAll('path')
    .attr('class', function(f) {
      // Use the quantized value for the class
      return quantize(getValueOfData(dataById[getIdOfFeature(f)]));
    });

  // We call the function to update the legend.
  updateLegend();
}

/**
 * Show the details of a feature in the details <div> container.
 * The content is rendered with a Mustache template.
 *
 * @param {object} f - A GeoJSON Feature object.
 */
function showDetails(f) {
  // Get the ID of the feature.
  // console.log(f)
  var id = getIdOfFeature(f);
  console.log(id);
  // Use the ID to get the data entry.
  var d = dataById[id];
  // console.log(d);
  // Render the Mustache template with the data object and put the
  // resulting HTML output in the details container.
  var detailsHtml = Mustache.render(template, d);

  // Hide the initial container.
  d3.select('#initial').classed("hidden", true);

  // Put the HTML output in the details container and show (unhide) it.
  d3.select('#details').html(detailsHtml);
  d3.select('#details').classed("hidden", false);
}

/**
 * Hide the details <div> container and show the initial content instead.
 */
function hideDetails() {
  // Hide the details
  d3.select('#details').classed("hidden", true);
  // Show the initial content
  d3.select('#initial').classed("hidden", false);
}

/**
 * Show a tooltip with the name of the feature.
 *
 * @param {object} f - A GeoJSON Feature object.
 */
function showTooltip(f) {
  // Get the ID of the feature.
  var id = getIdOfFeature(f);
  // Use the ID to get the data entry.
  var d = dataById[id];
  console.log(d)

  // Get the current mouse position (as integer)
  var mouse = d3.mouse(d3.select('#map').node()).map(
    function(d) { return parseInt(d); }
  );

  // Calculate the absolute left and top offsets of the tooltip. If the
  // mouse is close to the right border of the map, show the tooltip on
  // the left.
  var left = Math.min(width - 4 * d.REGION_L.length, mouse[0] + 5);
  var top = mouse[1] + 25;

  // Show the tooltip (unhide it) and set the name of the data entry.
  // Set the position as calculated before.
  var formatDate0 = d3.time.format("%Y-%m-%d")
  var formatDate1 = d3.time.format("%Y %b %d")
  var formatDecimal = d3.format(".2f") // d3.format(".2f") if NOT per 100k; otherwise, d3.format(".0f")
  const dateV = formatDate0.parse(d.DATE)
  console.log(formatDate1(dateV))
  tooltip.classed('hidden', false)
    .attr("style", "left:" + left + "px; top:" + top + "px")
    .html(d.REGION_L + "<br/><i>VALUE</i> (as of " + formatDate1(dateV) + "):   " + formatDecimal(d[currentKey])); // 
  console.log(currentKey)

    // div.html("<b>" + DateFormat(d.month) + "</b><br/> <i>actual</i> : "  + d.mav.toFixed(0) + "<br/> <i>7-day MA</i> : " + d.count.toFixed(0)) 
    // useful for d3 js v3: https://stackoverflow.com/questions/37774053/d3-function-to-parse-the-date-not-working   
    // ish (for d3 js v4) https://stackoverflow.com/questions/17721929/date-format-in-d3-js
}

/**
 * Hide the tooltip.
 */
function hideTooltip() {
  tooltip.classed('hidden', true);
}

/**
 * Zoom the features on the map. This rescales the features on the map.
 * Keep the stroke width proportional when zooming in.
 */
function doZoom() {
  mapFeatures.attr("transform",
    "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")")
    // Keep the stroke width proportional. The initial stroke width
    // (0.5) must match the one set in the CSS.
    .style("stroke-width", 0.5 / d3.event.scale + "px");
}

/**
 * Calculate the scale factor and the center coordinates of a GeoJSON
 * FeatureCollection. For the calculation, the height and width of the
 * map container is needed.
 *
 * Thanks to: http://stackoverflow.com/a/17067379/841644
 *
 * @param {object} features - A GeoJSON FeatureCollection object
 *   containing a list of features.
 *
 * @return {object} An object containing the following attributes:
 *   - scale: The calculated scale factor.
 *   - center: A list of two coordinates marking the center.
 */
function calculateScaleCenter(features) {
  // Get the bounding box of the paths (in pixels!) and calculate a
  // scale factor based on the size of the bounding box and the map
  // size.
  var bbox_path = path.bounds(features),
      scale = 0.95 / Math.max(
        (bbox_path[1][0] - bbox_path[0][0]) / width,
        (bbox_path[1][1] - bbox_path[0][1]) / height
      );

  // Get the bounding box of the features (in map units!) and use it
  // to calculate the center of the features.
  var bbox_feature = d3.geo.bounds(features),
      center = [
        (bbox_feature[1][0] + bbox_feature[0][0]) / 2,
        (bbox_feature[1][1] + bbox_feature[0][1]) / 2];

  return {
    'scale': scale,
    'center': center
  };
}

/**
 * Helper function to access the (current) value of a data object.
 *
 * Use "+" to convert text values to numbers.
 *
 * @param {object} d - A data object representing an entry (one line) of
 * the data CSV.
 */
function getValueOfData(d) {
  return +d[currentKey];
}

/**
 * Helper function to retrieve the ID of a feature. The ID is found in
 * the properties of the feature.
 *
 * @param {object} f - A GeoJSON Feature object.
 */
function getIdOfFeature(f) {
  return f.properties.REGION;
}



////////////////////////////////////////////////
////////////////////////////////////////////////
////////////////////////////////////////////////
////////////////////////////////////////////////
////////////////////////////////////////////////
////////////////////////////////////////////////
////////////////////////////////////////////////
////////////////////////////////////////////////
////////////////////////////////////////////////

// example data
var metricName   = "cases";

// for this: increase bottom from 100 -> 150 (any value >100)
var margin = { top:50, right: 0, bottom: 120, left: 30 },
  widthP = 630// 960 - margin.left - margin.right,
  heightP = 430 - margin.top - margin.bottom,
  gridSize = Math.floor(widthP / 24),
  legendElementWidth = gridSize*2,
  buckets = 9; 

  

var optwidth        = widthP // 800 //430 //300 //1000 //600;
var optheight       = 390 // 450 //390 //400 //400//370;

// the length of a day/year in milliseconds
var day_in_ms = 86400000,
    ms_in_year = 31540000000;

// var vis





////////////////////////////////////
////////////////////////////////////
////// crucial /////
////// dapat nasa labas ng loop ang svg and 
///// select button to avoid
///// the dropdown list to add up
///// each time a choice is selected
var svgP = d3.select("#chart").append("svg")
  .attr("width", widthP + margin.left + margin.right)
  .attr("height", heightP + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");




function getFname(dkey) {

    return 'data/covid19ph/combi_' + dkey + '_daily_and_movAve_ph_covid19_stats_forDashboards_nWindow=7.csv'
    // return 'data/' + dkey + '_data.csv'
} /// crucial!!!!!!!!

function plotF(f) {
// var plotF = function(csvFile) {

// var vis = 0    

var id = getIdOfFeature(f)
console.log(id)
// console.log(csvFile)



cKey = convertToFileName(currentKey, currentVar)
console.log(cKey)
console.log(currentVar)



d3.csv(getFname(cKey), function(error, datasetInit) {
  datasetInit.forEach(function(r) {

    r.month = r.DATE;
    r.mav = +r[currentKey];
    r.count = +r['MA7_' + currentKey];
    r.region = r.REGION_L;

    });
// console.log(datasetInit)

// console.log(datasetInit[0])  
// format month as a date

datasetInit = datasetInit.filter(function(q){return q.month!=""}) // temporary fix kase inaappend din niya yung header :(
datasetInit.forEach(function(d) {
    d.month = d3.time.format("%Y-%m-%d").parse(d.month);
    // d.month = d3.time.hour.offset(d.month, -3) // offset by 3 h; goal is to center the bar wrt to the scatter-line plot; https://stackoverflow.com/questions/20276173/how-to-define-custom-time-interval-in-d3-js
});    
// sort datasetInit by month
datasetInit.sort(function(x, y){
   return d3.ascending(x.month, y.month);
});
console.log(datasetInit)

dataset = datasetInit.filter(function(q){return q.region==id})
console.log(dataset)
// .datum(data.filter(function(d){return d.name==allGroup[0]}))
// a dataset without the null values is also needed to draw the missing data lines/areas
var dataset_no_null = dataset  // dataset.filter(function(d) { return d.mav;}); //!== null; });



/*
* ========================================================================
*  sizing
* ========================================================================
*/

/* === Focus chart === */

var margin  = {top: 40, right: 30, bottom: 100, left: 20},
    width   = optwidth - margin.left - margin.right,
    height  = optheight - margin.top - margin.bottom;

/* === Context chart === */

var margin_context = {top: 320, right: 30, bottom: 20, left: 20},
    height_context = optheight - margin_context.top - margin_context.bottom;

/*
* ========================================================================
*  x and y coordinates
* ========================================================================
*/

// the date range of available data:
var lrangx = d3.extent(datasetInit, function(d) { return d.month; });

var maxLrangy = [];
maxLrangy.push(d3.max(dataset, function(d) { return d.count; }));
maxLrangy.push(d3.max(dataset, function(d) { return d.mav; }));

var minLrangy = [];
minLrangy.push(d3.min(dataset, function(d) { return d.count; })); // crucial!!!!!; to include negative values
// https://stackoverflow.com/questions/43855104/how-to-automatically-resize-d3-js-graph-to-include-axis
minLrangy.push(d3.min(dataset, function(d) { return d.mav; }));

// console.log([0, d3.max(lrangy)*1.])
var dataYrange = [d3.min(minLrangy)*1.3, d3.max(maxLrangy)*1.3];
console.log(dataYrange[0])

var dataXrange = []
// var dataXrange = [lrangx[0], lrangx[1]];
offsetMin = -1
offsetMax = 2
dataXrange.push(d3.time.day.offset(lrangx[0], offsetMin));
dataXrange.push(d3.time.day.offset(lrangx[1], offsetMax)); // in d3 js v4, it's d3.timeDay
// inspo from: https://stackoverflow.com/questions/45570438/how-to-modify-a-domain-dealing-with-dates-in-d3-js
console.log(lrangx)
console.log(dataXrange)




//////
if(dataYrange[1] < 10){
    formatNumber = d3.format('.2f');
}

///////




/////////////////////
// add about a month to the end of the x range to show the last bar (which starts on the first of the month)
var x_full_extent = d3.extent(dataset, function(d) { return d.month; });//,
    new_max_date = new Date(x_full_extent[1].getTime() + (day_in_ms * 24)),
    x_full_extent = [x_full_extent[0], new_max_date];


// maximum date range allowed to display
formatter = d3.time.format("%Y-%m-%d");
var mindate = d3.time.hour.offset(dataXrange[0], -1*offsetMin*24  - offsetMin*24/4)  // dataXrange[0], //formatter(d3.time.day.offset(dataXrange[0], 7)),  // use the range of the data
    maxdate = d3.time.hour.offset(dataXrange[1], -1*offsetMax*24 + offsetMax*24/4) // dataXrange[1] //formatter(d3.time.day.offset(dataXrange[1], -7));


// formatter(d3.time.day.offset(mindate, 3)); // Returns "2014-06-27" (and today is the 24th!)
// console.log(formatter(d3.time.day.offset(dataXrange[0], 0))) // https://stackoverflow.com/questions/24368109/storing-a-date-and-this-date-3-days-with-d3-js

var DateFormat    =  d3.time.format("%d %b %Y");

var dynamicDateFormat = timeFormat([
    [d3.time.format("%Y"), function() { return true; }],// <-- how to display when Jan 1 YYYY
    [d3.time.format("%b %Y"), function(d) { return d.getMonth(); }],
    [function(){return "";}, function(d) { return d.getDate() != 1; }]
]);



/* === Focus Chart === */

var x = d3.time.scale()
    .range([0, (widthP)])
    // .domain([d3.time.hour.offset(dataXrange[0], -1*offsetMin*24 - 1*offsetMin*24/3), d3.time.hour.offset(dataXrange[1], -1*offsetMax*24 + offsetMax*24/4)]);
    .domain(dataXrange);
console.log(x)

// var x = d3.scale.ordinal()
//     .rangeBands([0, width], 0, 0.09)
//     .domain(dataset.map(function(d){ return d.month}));

// The ordinal scale is used only for its `rangeBands` method, to automatially
// calculate the width of columns of column chart for details, see:
// https://stackoverflow.com/questions/12186366/d3-js-evenly-spaced-bars-on-a-time-scale
var x_ordinal = d3.scale.ordinal()
    .rangeBands([0, widthP], 0, 200)
    .domain(dataXrange)//(dataset.map(function(d){ return d.month}));
//// ^ from: https://bl.ocks.org/robyngit/981590aa194d930b22aa45cdba79beaf





var y = d3.scale.linear()
    .range([heightP, 0])
    .domain(dataYrange);
console.log(dataYrange)

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
        .tickSize(-(heightP))
    .ticks(customTickFunction)
    // .ticks(5)
    .tickFormat(dynamicDateFormat);

var yAxis = d3.svg.axis()
    .scale(y)
    .ticks(4)
    .tickSize(-(widthP))
    .orient("right");

/* === Context Chart === */

var x2 = d3.time.scale()
    .range([0, widthP])
    // .domain([mindate, maxdate]);
    .domain(dataXrange);

var y2 = d3.scale.linear()
    .range([height_context, 0])
    .domain(y.domain());
console.log(y.domain())

var xAxis_context = d3.svg.axis()
    .scale(x2)
    .orient("bottom")
    // .ticks(2) // update this to be adaptive!
    .ticks(xcustomTickFunction)
    // .tickFormat(cdynamicDateFormat);
    // .tickFormat(d3.time.format("%b %Y"))

/*
* ========================================================================
*  Plotted line and area variables
* ========================================================================
*/

/* === Focus Chart === */

var line = d3.svg.line()
    .defined(function(d) { return d['count']!== null ; }) //!== null; }) --> crucial!!!!
    // inspos from: https://stackoverflow.com/questions/54610592/how-to-continue-line-when-data-is-null-or-zero
    // https://stackoverflow.com/questions/19221320/d3-line-defined-doesnt-draw-zero-value
    .x(function(d) { return x(d.month); })
    .y(function(d) { return y(d.mav); });
    // .y(function(d) { return y(Math.max(0, d.mav)); });
    


var line_missing = d3.svg.line()
    .x(function(d) { return x(d.month); })
    .y(function(d) { return y(d.mav); });



/* === Context Chart === */

var line_context = d3.svg.line()
    .defined(function(d) { return d.mav ; }) //!== null; })
    .x(function(d) { return x2(d.month); })
    // .y(function(d) { return y2(d.mav); });
    // .y(function(d) { return y(d.mav); });
    .y(function(d) { return y2(Math.max(0, d.mav)); });    



var line_context_missing = d3.svg.line()
    .x(function(d) { return x2(d.month); })
    .y(function(d) { return y2(d.mav); });



/*
* ========================================================================
*  Variables for brushing and zooming behaviour
* ========================================================================
*/

var brush = d3.svg.brush()
    .x(x2)
    .on("brush", brushed)
    .on("brushend", brushend);

var zoom = d3.behavior.zoom()
    .on("zoom", draw)
    .on("zoomend", brushend);

/*
* ========================================================================
*  Define the SVG area ("vis") and append all the layers
* ========================================================================
*/

// === the main components === //

var vis = d3.select("#metric-modal").append("svg")
    .attr("width", widthP + margin.left + margin.right)
    .attr("height", heightP + margin.top + margin.bottom)
    .attr("class", "metric-chart");// CB -- "line-chart" -- CB //

vis.append("defs").append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", widthP)
    .attr("height", heightP);
    // clipPath is used to keep line and area from moving outside of plot area when user zooms/scrolls/brushes

var rect = vis.append("svg:rect")
    .attr("class", "pane")
    .attr("width", widthP)
    .attr("height", heightP)
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var context = vis.append("g")
    .attr("class", "context")
    .attr("transform", "translate(" + margin_context.left + "," + margin_context.top + ")");

var focus = vis.append("g")
    .attr("class", "focus")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

rect.call(zoom)
    .call(draw);

// === current date range text & zoom buttons === //

var display_range_group = vis.append("g")
    .attr("id", "buttons_group")
    .attr("transform", "translate(" + 0 + ","+ 0 +")");

var expl_text = display_range_group.append("text")
    .text("Range:  ")
    .style("text-anchor", "start")
    .attr("transform", "translate(" + 0 + ","+ 8 +")");

display_range_group.append("text")
    .attr("id", "displayDates")
    // .text(DateFormat(dataXrange[0]) + " - " + DateFormat(dataXrange[1]))
    .text(DateFormat(d3.time.hour.offset(dataXrange[0], -1*offsetMin*24)) + " - " + DateFormat(d3.time.day.offset(dataXrange[1], -1*offsetMax)))

    .style("text-anchor", "start")
    .attr("transform", "translate(" + 42             + ","+ 8 +")");

var expl_text = display_range_group.append("text")
    .text("Zoom to: ")
    .style("text-anchor", "start")
    .attr("transform", "translate(" + 0       + ","+ 25 +")");



var expl_text_note1 = display_range_group.append("text")
    .text("line:  7-day MA")
    .style("font-weight",600) // https://codepen.io/Rbrath/pen/XyeMLB; range: 100-900    
    .style("text-anchor", "start")
    .attr("transform", "translate(" + 330       + ","+ 8 +")");

var expl_text_note2 = display_range_group.append("text")
    .text("bar:  actual value")
    .style("font-weight",600) // https://codepen.io/Rbrath/pen/XyeMLB; range: 100-900
    .style("fill",'#b9bec7') // '#00AA8D' // https://stackoverflow.com/questions/22523204/how-to-set-text-color-for-my-d3-chart-title
    .style("text-anchor", "start")
    .attr("transform", "translate(" + 330       + ","+ 20 +")");


var expl_text_note2 = display_range_group.append("text")
    .text("Region: " + id)
    .style("font-weight",600) // https://codepen.io/Rbrath/pen/XyeMLB; range: 100-900
    // .style("fill",'#00AA8D') // https://stackoverflow.com/questions/22523204/how-to-set-text-color-for-my-d3-chart-title
    .style("text-anchor", "start")
    .attr("transform", "translate(" + 330       + ","+ 32 +")");
    // .style("startOffset", "100%")
// === the zooming/scaling buttons === //

var button_width = 52;
var button_height = 14;

// don't show year button if < 1 year of data
var dateRange  = dataXrange[1] - dataXrange[0] //,
    // ms_in_year = 31540000000;
// console.log(dataXrange[1])

// button_data = ['data']
if (dateRange < ms_in_year)   {
    var button_data =["2 weeks ago", "month","data"];
} else {
    var button_data =["year","2 weeks ago","month","data"];
};

var button = display_range_group.selectAll("g")
    .data(button_data)
    .enter().append("g")
    .attr("class", "scale_button")
    .attr("transform", function(d, i) { return "translate(" + (42 + i*button_width + i*10) + ",15)"; }) // trial and error
    .on("click", scaleDate);

button.append("rect")
    .attr("width", button_width)
    .attr("height", button_height)
    .attr("rx", 1)
    .attr("ry", 1);

button.append("text")
    .attr("dy", (button_height/2 + 3))
    .attr("dx", button_width/2)
    .style("text-anchor", "middle")
    .text(function(d) { return d; });

/* === focus chart === */

focus.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .attr("transform", "translate(" + (widthP) + ", 0)");


// x-axis
focus.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + heightP + ")")
    .call(xAxis);


// complete data line
focus.append("path")
    .datum(dataset_no_null)
    .attr("class", "line")
    .attr("d", line);


var hMove = 12
// enter bars
console.log(x_ordinal.rangeBand())
focus.selectAll(".bar")
    .data(dataset)
    .enter().append("rect")
            .attr("class", "bar")
            .attr("id", function(d){return "bar_" + d.month.getTime()}) //id of each bar is "bar_" plus it's associated date in ms
            // d.month = d3.time.hour.offset(d.month, -18) // offset by 6 h; https://stackoverflow.com/
            // .attr("x", function (d) {return x(d.month);         })
            .attr("x", function (d) {return x(d3.time.hour.offset(d.month, -1*1));         })     // crucial       
            .attr("y", heightP)
            .attr("height", 0)
            .attr("width", x_ordinal.rangeBand())
            .style("opacity", 0.4)

// animate bars
focus.selectAll(".bar")
    .transition()
    .duration(450)
    .ease("elastic", 1.03, 0.98)
    .delay(function(d, i) {
        var max_delay = 600;
        var z = i / (dataset.length-1);
        var line_z =  z * max_delay * 0.4;
        var log_z = Math.log2(z + 1) * max_delay * 0.6;
        return(250+line_z + log_z);
    })
    // .attr("y", function (d) {return y(d.count);         })
    // .attr("height", function (d) {return y(0) - y(d.count);         })
    .attr("y", function(d) { return y(Math.max(0, d.count)); }) // https://stackoverflow.com/questions/27271770/d3-js-bar-chart-supporting-negative-values
    .attr("height", function(d) { return Math.abs(y(d.count) - y(0)); }) // https://stackoverflow.com/questions/27271770/d3-js-bar-chart-supporting-negative-values
    .style("opacity", 0.4);

// circles
focus.selectAll(".dot")
    .data(dataset_no_null)
    .enter().append("circle")
      .attr("class", "dot")
      .attr("r", 1)
      .attr("color",'#9db9c2')
      .attr("cx", function(d) { return x(d.month); })
      .attr("cy", function(d) { return y(d.mav); }) // change this to .count
      .on("mouseover", function(d) {show_tooltip(d)} )
      .on("mouseout", function(d) {hide_tooltip(d)} );




/* === tooltip === */
var div = d3.select("#metric-modal").append("div")
    .attr("class", "tooltipP")
    .style("opacity", 0);

context.append("path")
    .datum(dataset_no_null)
    .attr("class", "line_missing")
    .attr("d", line_context_missing);

context.append("path")
    .datum(dataset)
    .attr("class", "line")
    .attr("d", line_context);



context.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height_context + ")")
    .call(xAxis_context);





/* === brush (part of context chart)  === */

var brushg = context.append("g")
    .attr("class", "x brush")
    .call(brush);

brushg.selectAll(".extent")
   // .attr("y", -6)
   .attr("height", height_context + 8);
   // .extent is the actual window/rectangle showing what's in focus

brushg.selectAll(".resize")
    .append("rect")
    .attr("class", "handle")
    .attr("transform", "translate(0," +  -3 + ")")
    .attr('rx', 2)
    .attr('ry', 2)
    .attr("height", height_context + 6)
    .attr("width", 3);

brushg.selectAll(".resize")
    .append("rect")
    .attr("class", "handle-mini")
    .attr("transform", "translate(-2,8)")
    .attr('rx', 3)
    .attr('ry', 3)
    .attr("height", (height_context/2))
    .attr("width", 7);
    // .resize are the handles on either size
    // of the 'window' (each is made of a set of rectangles)

/* === y axis title === */



console.log(convertToText(currentKey))
vis.append("text")
    .attr("class", "y axis title")
    .text(convertToText(currentKey))
    // .text("Monthly " + this.metricName)
    .style("font-weight",800) // https://codepen.io/Rbrath/pen/XyeMLB; range: 100-900
    .attr("x", (-(heightP/1.5)))
    .attr("y", 6)
    .attr("dy", "0.71em")
    .attr("transform", "rotate(-90)")
    .style("text-anchor", "middle");


zoom.x(x);




/*
* ========================================================================
*  Functions
* ========================================================================
*/

// === tick/date formatting functions ===
// from: https://stackoverflow.com/questions/20010864/d3-axis-labels-become-too-fine-grained-when-zoomed-in

function timeFormat(formats) {
  return function(date) {
    var i = formats.length - 1, f = formats[i];
    while (!f[1](date)) f = formats[--i];
    return f[0](date);
  };
};




function xcustomTickFunction(t0, t1, dt)  {
    var labelSize = 42; //
    var maxTotalLabels = Math.floor(widthP / labelSize);

    function step(date, offset)
    {
        date.setMonth(date.getMonth() + offset);
    }

    var time = d3.time.month.ceil(t0), times = [], monthFactors = [12];

    while (time < t1) times.push(new Date(+time)), step(time, 1);
    var timesCopy = times;
    var i;
    for(i=0 ; times.length > maxTotalLabels ; i++)
        times = _.filter(timesCopy, function(d){
            return (d.getMonth()) % monthFactors[i] == 0;
        });

    return times;
};


function customTickFunction(t0, t1, dt)
{

    var labelSize = 42; // largest label is 23 pixels ("May")
    var maxTotalLabels = Math.floor(width / labelSize);
    console.log(maxTotalLabels)

    function step(date, offset)
    {
        date.setMonth(date.getMonth() + offset);
    }

    var time = d3.time.month.ceil(t0), times = [], monthFactors = [2,3,4,6];

    while (time < t1) times.push(new Date(+time)), step(time, 1);

    var i;
    for(i=1 ; times.length > maxTotalLabels ; i++)
        times = _.filter(times, function(d){
            return (d.getMonth()) % monthFactors[i] == 0;
        });

    return times;
}
// from: https://stackoverflow.com/questions/20010864/d3-axis-labels-become-too-fine-grained-when-zoomed-in

// === tooltip functions === //

// from: http://bl.ocks.org/d3noob/a22c42db65eb00d4e369
function show_tooltip(d) {

    if (d.mav == 1) {
        var metricName_point = metricName.slice(0, -1);
    } else {
        var metricName_point = metricName;
    }

    div.transition()
        .duration(60)
        .style("opacity", 0.98);
    // div.html("<b>" + DateFormat(d.month) + "</b><br/> actual:"  + d.mav + " " + metricName_point + "<br/> 7-day MA:" + d.count + " " + metricName_point )
    // d.mav.toFixed(0) // from https://www.tutorialspoint.com/How-to-format-a-number-with-two-decimals-in-JavaScript
    div.html("<b>" + DateFormat(d.month) + "</b><br/> <i>actual</i> : "  + d.mav.toFixed(2) + "<br/> <i>7-day MA</i> : " + d.count.toFixed(2))    
        .style("left", (d3.event.pageX -30) + "px")//(d3.event.pageX) + "px"
        .style("top", (d3.event.pageY -50) + "px");//(d3.event.pageY - 28) + "px" // -40 --> -50
    };

function hide_tooltip(d) {
            div.transition()
                .duration(60)
                .style("opacity", 0);
};


// === brush and zoom functions ===

function brushed() {
    x.domain(brush.empty() ? x2.domain() : brush.extent());
    common_behaviour();
    // Reset zoom scale's domain
    zoom.x(x);
    updateDisplayDates();
    setYdomain();

}

function draw() {
    setYdomain();
    common_behaviour();
    // Force changing brush range
    brush.extent(x.domain());
    vis.select(".brush").call(brush);
    // and update the text showing range of dates.
    updateDisplayDates();
}

function common_behaviour() {
    // focus.select(".area").attr("d", area);
    focus.select(".line").attr("d", line);
    // focus.select(".area_missing").attr("d", area_missing);
    focus.select(".line_missing").attr("d", line_missing);
    focus.select(".x.axis").call(xAxis);
    focus.selectAll(".dot")
        .attr("cx", function(d) { return x(d.month); })
        .attr("cy", function(d) { return y(d.mav); }); // change this! --> mav

};

function brushend() {
// when brush stops moving:

    // check whether chart was scrolled out of bounds and fix,
    var b = brush.extent();
    var out_of_bounds = brush.extent().some(function(e) { return e < mindate | e > maxdate; });
    if (out_of_bounds){ b = moveInBounds(b) };

};

function updateDisplayDates() {

    var b = brush.extent();
    // // update the text that shows the range of displayed dates
    var localBrushDateStart = (brush.empty()) ? DateFormat(dataXrange[0]) : DateFormat(d3.time.hour.offset(b[0], -1*offsetMin*24)), ////// crucial!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!; rationale: nag offset ako ng -1 day sa range; knowing that b is the mininum-est minimum, heto dapat ang in-addjust ng +1 day; BUT THE OFFSETS ARE KILLING ME!!!!
        localBrushDateEnd   = (brush.empty()) ? DateFormat(dataXrange[1]) : DateFormat(b[1]);

    // var localBrushDateStart = (brush.empty()) ? DateFormat(d3.time.hour.offset(dataXrange[0], -1*offsetMin*24 - 1*offsetMin*24/2)) : DateFormat(b[0]),
    //     localBrushDateEnd   = (brush.empty()) ? DateFormat(d3.time.day.offset(dataXrange[1], -1*offsetMax)) : DateFormat(b[1]);



    // Update start and end dates in upper right-hand corner
    d3.select("#displayDates")
        .text(localBrushDateStart == localBrushDateEnd ? localBrushDateStart : localBrushDateStart + " - " + localBrushDateEnd);
};

function moveInBounds(b) {
// move back to boundaries if user pans outside min and max date.

    var ms_in_year = 31536000000,
        brush_start_new,
        brush_end_new;

    if       (b[0] < mindate)   { brush_start_new = mindate; }
    else if  (b[0] > maxdate)   { brush_start_new = new Date(maxdate.getTime() - ms_in_year); }
    else                        { brush_start_new = b[0]; };

    if       (b[1] > maxdate)   { brush_end_new = maxdate; }
    else if  (b[1] < mindate)   { brush_end_new = new Date(mindate.getTime() + ms_in_year); }
    else                        { brush_end_new = b[1]; };

    brush.extent([brush_start_new, brush_end_new]);

    brush(d3.select(".brush").transition());
    brushed();
    draw();

    return(brush.extent())
};

function setYdomain(){
// this function dynamically changes the y-axis to fit the data in focus

    // get the min and max date in focus
    var xleft = new Date(x.domain()[0]);
    var xright = new Date(x.domain()[1]);

    // a function that finds the nearest point to the right of a point
    var bisectDate = d3.bisector(function(d) { return d.month; }).right;

    // get the y value of the line at the left edge of view port:
    var iL = bisectDate(dataset_no_null, xleft);

    if (dataset_no_null[iL] !== undefined && dataset_no_null[iL-1] !== undefined) {

        var left_dateBefore = dataset_no_null[iL-1].month,
            left_dateAfter = dataset_no_null[iL].month;

        var intfun = d3.interpolateNumber(dataset_no_null[iL-1].mav, dataset_no_null[iL].mav);
        var yleft = intfun((xleft-left_dateBefore)/(left_dateAfter-left_dateBefore));
    } else {
        var yleft = 0;
    }

    // get the x value of the line at the right edge of view port:
    var iR = bisectDate(dataset_no_null, xright);

    if (dataset_no_null[iR] !== undefined && dataset_no_null[iR-1] !== undefined) {

        var right_dateBefore = dataset_no_null[iR-1].month,
            right_dateAfter = dataset_no_null[iR].month;

        var intfun = d3.interpolateNumber(dataset_no_null[iR-1].mav, dataset_no_null[iR].mav);
        var yright = intfun((xright-right_dateBefore)/(right_dateAfter-right_dateBefore));
    } else {
        var yright = 0;
    }

    // get the y values of all the actual data points that are in view
    var dataSubset = dataset.filter(function(d){ return d.month >= xleft && d.month <= xright; });
    var countSubset = [];
    dataSubset.map(function(d) {countSubset.push(d.mav);});

    ///////////////
    // var y_max_focus = d3.max(data_subset_focus, function(d) { return d.mav; }) || 1;
    var y_change_duration = 85;
    ///////////////



    // add the edge values of the line to the array of counts in view, get the max y;
    countSubset.push(yleft);
    countSubset.push(yright);
    var ymax_new = d3.max(countSubset)*1.3;
    var ymin = d3.min(countSubset)*1.3;


    console.log(ymax_new/1.3)
    console.log(ymin/1.3)
    if(ymax_new == 0){
        // ymax_new = 0.05*dataYrange[1];
        ymax_new = 0.05*Math.abs(d3.min([1,dataYrange[0],dataYrange[1]]))
    }

    if(ymax_new < 0){
        ymax_new = 0;
    }    


    // reset and redraw the yaxis
    console.log(ymin)

    // if(ymin > 0){
    //     ymin = -1*0.05*d3.min([dataYrange[0],dataYrange[1]]);
    // }

    if(ymin >= 0){
        ymin = -1*0.05*Math.abs(d3.min([1,dataYrange[0],dataYrange[1]])) //*dataYrange[1]; //dataYrange[1]/4;
    }


    // reset and redraw the yaxis
    console.log(ymin)

    console.log(ymax_new)
    y.domain([ymin, ymax_new]); // crucial!!!!!
    focus.select(".y.axis").call(yAxis);


    var zScale = get_zoom_scale()
    if(zScale > 2){
        zScale = zScale/4 // https://stackoverflow.com/questions/14718561/how-to-check-if-a-number-is-between-two-values
    }    
    ///////////////////////////////////
    // reset bar height given y-axis
    focus.selectAll(".bar")
        .transition()
        .duration(y_change_duration)
        // .attr("y", function (d) {return y(d.count);         })
        // .attr("height", function (d) {return y(0) - y(d.count);         });        
        .attr("x", function (d) {return x(d3.time.hour.offset(d.month, -1*hMove/2)); })// crucial; to center the bars         })        
        .attr("y", function(d) { return y(Math.max(0, d.count)); }) // https://stackoverflow.com/questions/27271770/        
        .attr("height", function(d) { return Math.abs(y(d.count) - y(0)); }) // https://stackoverflow.com/questions/27271770/      

        // inspo: https://stackoverflow.com/questions/27271770/d3-js-bar-chart-supporting-negative-values
        // http://jsfiddle.net/chrisJamesC/tNdJj/4/

        // covers negative values

    // redraw other elements
    focus.select(".x.axis").call(xAxis);
    focus.selectAll(".bar")
        .attr("x", function (d) {return x(d.month) -2;         })
        .attr("width", x_ordinal.rangeBand() * get_zoom_scale()*2*0.3)
        .style("opacity", 0.4); // incase user scrolls before entrance animation finishes.

    console.log(get_zoom_scale())
    focus.selectAll(".dot")
          .attr("r", 0.9* zScale)
          .attr("color",'black')
          .attr("cx", function(d) { return x(d.month); })
          .attr("cy", function(d) { return y(d.mav); }) 
          .on("mouseover", function(d) {show_tooltip(d)} )
          .on("mouseout", function(d) {hide_tooltip(d)} );        
    ///////////////////////////////////    

};

function scaleDate(d,i) {
// action for buttons that scale focus to certain time interval

    var b = brush.extent(),
        interval_ms,
        brush_end_new,
        brush_start_new;

    if      (d == "year")   { interval_ms = 31536000000} // leap year: 31622400000; - offsetMin*86400000
    if      (d == "month")  { interval_ms = 2592000000}; // 30 d = 2592000000 ms
    if      (d == "2 weeks ago")  { interval_ms = 1209600000}; // 14 d = 1209600000 ms

    if ( d == "year" | d == "month" | d == "2 weeks ago" )  {

        if((maxdate.getTime() - b[1].getTime()) < interval_ms){
        // if brush is too far to the right that increasing the right-hand brush boundary would make the chart go out of bounds....
            brush_start_new = new Date(maxdate.getTime() - interval_ms); // ...then decrease the left-hand brush boundary...
            brush_end_new = maxdate; //...and set the right-hand brush boundary to the maxiumum limit.
        } else {
        // otherwise, increase the right-hand brush boundary.
            brush_start_new = b[0];
            brush_end_new = new Date(b[0].getTime() + interval_ms);
        };

    } else if ( d == "data")  {
        brush_start_new = dataXrange[0]; //d3.time.day.offset(dataXrange[0], -1*offsetMin) // dataXrange[0];
        brush_end_new = dataXrange[1]; //d3.time.day.offset(dataXrange[1], -1*offsetMax) // dataXrange[1]
    } else {
        brush_start_new = b[0];
        brush_end_new = b[1];
    };

    brush.extent([brush_start_new, brush_end_new]);

    // now draw the brush to match our extent
    brush(d3.select(".brush").transition());
    // now fire the brushstart, brushmove, and brushend events
    brush.event(d3.select(".brush").transition());


};


////////////////////////////////////////////////
function get_zoom_scale(){
// custom zoom scale needed to calculate width of bars with zoom/brush.
// can't use zoom.scale() because this needs to be reset (to one) when using change_focus_brush()
    var x_current_width = x.domain()[1] - x.domain()[0],
        x_total_width = dataXrange[1] - dataXrange[0],
        zoom_scale = x_total_width/x_current_width;
    return(zoom_scale);
};

// d3.select("#chart").exit().remove()



})




d3.select("#metric-modal").selectAll("svg").remove()
// d3.select("#selectButton").exit()

//  crucial!!!!!!!!!!
//  https://stackoverflow.com/questions/29758385/clear-d3-js-charts-before-loading-new-chart



}
////////////////////////////////////////////////
////////////////////////////////////////////////
