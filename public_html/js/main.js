
//  Variables
var map = {};

//  Can be nearest, which just shows the nearest spots or "all" which shows all
var mode = "nearest";
var lat = 37.7509;
var lng = -122.4394;
var startingLocation = null;
var panorama = null;
//  Should the map show spots which have already been reserved or not?
var showReserved = false;

function redrawMap() {

	//  Establish a location for the user.  We start in the middle of the city.
	startingLocation = new google.maps.LatLng(lat, lng);

	// Set up map, zoom based on mode
	map = new google.maps.Map(document.getElementById('map'), {
		center: startingLocation,
		zoom: mode === "nearest" ? 15 : 13

	});


	map.openInfoWindow = null;
	
	//  Location marker for user
	var myLocationMarker = new google.maps.Marker({
		position: startingLocation,
		map: map,
		title: 'You are here',
		icon: {
			path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
			scale: 5,
			strokeColor: 'blue',
			strokeWeight: 2,
			fillColor: 'yellow',
			fillOpacity: 0.6
		},
		draggable: true

	});

	//  You can your marker (or click the map) to recent and redraw.
	//  If mode is show nearest, redraw the map, if not don't
	myLocationMarker.addListener("dragend", function (event) {
		moveMarkerEvent(event, mode === "nearest");
	});

	var url;
	if (mode === "nearest")
		url = 'http://ridecellparking.herokuapp.com/api/v1/parkinglocations/search?lat=' + startingLocation.lat() + '&lng=' + startingLocation.lng() + '&format=json';
	else
		url = 'http://ridecellparking.herokuapp.com/api/v1/parkinglocations?format=json';

	//  Call Api	
	$.getJSON(url, function (data) {


		for (var i = 0, max = data.length; i < max; i++) {
			var spotLocation = {lat: parseFloat(data[i].lat), lng: parseFloat(data[i].lng)};

			// Only draw marker if you should beased on whether it's reserved and if you are showing reserved
			if (showReserved || (!data[i].is_reserved)) {

				var spotMarker = new google.maps.Marker({
					position: spotLocation,
					map: map,
					title: data[i].is_reserved ? 'Spot ' + data[i].name + ' is reserved.' : 'Spot ' + data[i].name + ' costs $' + data[i].cost_per_minute + '/min',
					icon: data[i].is_reserved ? 'img/icon_red.png' : 'img/icon.png',
					draggable: false
				});

				spotMarker.id = i;
				
				//  We store the spot data on the spotMarker object for convenience.
				spotMarker.rideCellData = data[i];
				
				// Event Handlers
				spotMarker.addListener('click', function (event) {
					var sp = this;

					// Get how far away the spot is so we can help the user choose
					var service = new google.maps.DistanceMatrixService();
					service.getDistanceMatrix(
							{
								origins: [new google.maps.LatLng(lat, lng)],
								destinations: [this.position],
								travelMode: google.maps.TravelMode.DRIVING,
								//transitOptions: TransitOptions,
								// drivingOptions: DrivingOptions,
								unitSystem: google.maps.UnitSystem.IMPERIAL
										// avoidHighways: Boolean,
										// avoidTolls: Boolean,
							}, callback);

					function callback(response, status) {

						sp.rideCellData.address = response.destinationAddresses[0];
						sp.rideCellData.distance = response.rows[0].elements[0].distance.text;
						sp.rideCellData.duration = response.rows[0].elements[0].duration.text;

						var clickString = 'clickedReserveButton(' + sp.rideCellData.id + ',' + sp.rideCellData.cost_per_minute + ',\'' + sp.rideCellData.address + '\');return false';
					    
						//  Create the html for the popup window  
						contentString = '<div class="infoWindowContent">' +
								'<h5>' + sp.rideCellData.address + '</h5>' +
								'<label for="nameSpan'+sp.rideCellData.id+'">Spot Name:&nbsp;</label><span id="nameSpan'+sp.rideCellData.id+'" >' + sp.rideCellData.name + '</span>&nbsp;&nbsp;' +
								'<label for="numberSpan'+sp.rideCellData.id+'">Spot Number:&nbsp;</label><span  id="numberSpan'+sp.rideCellData.id+'">' + sp.rideCellData.id + '</span><br>' +
								'<label for="costSpan'+sp.rideCellData.id+'">Cost Per Minute:&nbsp;</label><span  id="" class="greentext">$' + sp.rideCellData.cost_per_minute + '</span><br>' +
								'<label for="distaceSpan'+sp.rideCellData.id+'">Distance:&nbsp;</label><span  id="distaceSpan'+sp.rideCellData.id+'">' + sp.rideCellData.distance + '</span>&nbsp;&nbsp;' +
								'<label for="drivetimeSpan'+sp.rideCellData.id+'">Drivetime:&nbsp;</label><span  id="drivetimeSpan'+sp.rideCellData.id+'">' + sp.rideCellData.duration + '</span><br>' +
								'<hr><input id="reserve' + sp.rideCellData.id + '" onclick="'+clickString+'" type="button" value="Reserve This Spot" />' +
								'&nbsp;for&nbsp;' + createSelectForTime(sp.rideCellData.id, sp.rideCellData.min_reserve_time_mins, sp.rideCellData.max_reserve_time_mins) + '&nbsp;minutes' +
								'</div>';
						// Create popup
						var infowindow = new google.maps.InfoWindow({
							content: contentString,
							position: spotLocation
						});
						
						// if old popup is open, close it
						if (map.openInfoWindow !== null) {
							map.openInfoWindow.close();
						}
						
						// open window
						infowindow.open(map, sp);
						map.openInfoWindow = infowindow;

						$("#infowindow").append(createSelectForTime(sp.id, data[sp.id].min_reserve_time_mins, data[sp.id].max_reserve_time_mins));

						//  show neighborhood preview for spot
						panorama = new google.maps.StreetViewPanorama(document.getElementById('streetViewer'),
								{position: sp.position});
					}

				});

				//  On popup close, derefernce our pointer to the open window
				spotMarker.addListener('close', function () {
					map.openInfoWindow = null;
				});
			}
		}
	});


	/*
	 * Event handlers
	 */

	 //  When you change the view mode, recenter the map
	$("#viewModeSelect").change(function () {
		mode = $("#viewModeSelect").val();
		redrawMap();
	});

	$("#showReservedCheckBox").change(function (event) {
		if (event.target.checked)
			showReserved = true;
		else
			showReserved = false;

		redrawMap();
	});


	map.addListener('click', function (event) {
		if (map.openInfoWindow !== null) {
			map.openInfoWindow.close();
		}

		if (panorama !== null) {
			panorama.setVisible(false);
			panorama = null;
		}

		moveMarkerEvent(event, mode === "nearest");
	});
}


//  Recenter the map if you drap the position marker
function moveMarkerEvent(event) {
	lat = event.latLng.lat();
	lng = event.latLng.lng();
	redrawMap();
}

/*
 * When you click the reserve button, we call the API to reserve the spot
 * and then show you a summary of the reservation.
 * @param {type} id:  to help us determine the amonut of time you selected.
 * @param {type} price:  cost of the spot
 * @param {type} address:  Address of the spot
 * @returns n/a
 */
function clickedReserveButton(id, price,  address) {
	console.log(id+" "+price+" "+time+" "+address);
	var time = parseInt($('#timeSelect'+id).val());
	
	var request = $.ajax({
		url: 'http://ridecellparking.herokuapp.com/api/v1/parkinglocations/' + id + '/reserve/',
		method: "POST",
		data: { minutes: time},
		dataType: "json"
	});

	request.done(function (msg) {
		$("#log").html(msg);

		var cost = price * time;
		//alert("boo");
		alert('You have sucessfully made a reservation for the parking spot at ' + address + '.  This spot is reserved for ' + time + ' minutes.  At a rate of $' + price + ' per minute, the reservation will cost you $' + cost);
		redrawMap();
	});

	request.fail(function (jqXHR, textStatus) {
		alert("Request failed: " + textStatus);
		console.dir(jqXHR);
	});


}


/*
 *   Utility Methods
 */

//  This method creates the html for the the time selector on the details popup.
//  All of the data in the DB is set for 10 minutes to 120 minute long reservations
//  I had assumed that there would be other min and max times and so I whipped 
//  up this method


function createSelectForTime(id, minimum, maximum) {

	var minimum = parseInt(minimum);
	var maximum = parseInt(maximum);

	var selectString = '<select id="timeSelect' + id + '">';


	for (var i = minimum; i <= maximum; i += 10) {

		if ((i + 10) >= maximum) {
			selectString += '<option selected="true" value="' + maximum + '">' + maximum + '</option>';
			break;
		} else 
			selectString += '<option value="' + i + '">' + i + '</option>';
	}
	selectString += '</select>';
	return selectString;
}
