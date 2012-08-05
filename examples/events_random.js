/**
 * Generate a random set of events.
 *
 * @param int min			: The minimum number of random events to return.
 * @param int max			: The maximum number of random events to return.
 *
 * @return array : An array of randomly generated event objects for
 *				 :  use in the calendar.
 */
function randomEvents( min, max, uidsuffix, daysbefore, daysafter )
{
	if( !min ) min = 50;
	if( !max ) max = 800;
	if( !daysbefore )	daysbefore = -21;
	if( !daysafter )	daysafter  = 21;
	if( !uidsuffix ) uidsuffix = '';
	
	var mins		= ['00','15','30','45'];
	var durations	= [15,15,15,15,30,30,30,30,30,45,45,45,45,45,60,60,60,60,60,60,90,120,165,210,245,300,600];
	var colors		= [ null, null, null, null, null, null, null, null, null, null, '#dddddd', '#7E0000', '#00630F', '#00630F' ];
	var notes		= [
		'Meeting',
		'Lunch',
		'Client',
		'Dentist Appointment',
		'Haircut',
		'Dinner',
		'Meeting with Boss',
		'Flight',
		'The big game',
		'Eye exam',
		'Doctor Appointment',
		'Take the car in for a service',
		'Walk the dog',
		'The cake is a lie',
		'Party'
	];
	var events 		= [], dayadd, hour, begins;
	
	for( var e=0; e<randomBetween(min,max); e++ ){
		
		dayadd		= randomBetween(daysbefore,daysafter);
		hour		= randomBetween(3,20);
		begins		= $.cal.date().addDays(dayadd).format('Y-m-d')+' '+( hour < 10 ? '0'+hour : hour )+':'+randomFrom(mins)+':00';
		
		events[e] = {
			uid		: e+uidsuffix,
			begins	: begins,
			ends	: $.cal.date(begins).addMinutes(randomFrom(durations)),
			notes	: randomFrom(notes),
			color	: randomFrom(colors)
		};
	}
	
	return events;
}

/**
 * Random number function. Used in randomEvents()
 *
 * @param int from			: The lowest number to return.
 * @param int to			: The highest number to return.
 *
 * @return : A number between (inclusive) from -> to.
 */
function randomBetween( from, to )
{
    return Math.floor(Math.random()*(to-from+1)+from);
}

/**
 * Random array item function. Used in randomEvents()
 *
 * @param array arr			: returns a random array element in a numerically keyed array.
 *
 * @return string : array item.
 */
function randomFrom(arr)
{
	return arr[randomBetween(0,arr.length-1)];
}