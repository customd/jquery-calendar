/** Make sure there are always a few this week **/
var events_static = [
	{
		uid		: 1,
		begins	: $.cal.date().addDays(2).format('Y-m-d')+' 10:10:00',
		ends	: $.cal.date().addDays(2).format('Y-m-d')+' 12:00:00',
		title	: 'Done',
		color	: '#dddddd'
	},
	{
		uid		: 2,
		begins	: $.cal.date().addDays(2).format('Y-m-d')+' 12:15:00',
		ends	: $.cal.date().addDays(2).format('Y-m-d')+' 13:45:00',
		notes	: 'Keepin\' it real…\n\nMan.'
	},
	{
		uid		: 3,
		begins	: $.cal.date().addDays(3).format('Y-m-d')+' 14:15:00',
		ends	: $.cal.date().addDays(3).format('Y-m-d')+' 16:30:00',
		notes	: 'An <example> event…'
	},
	{
		uid		: 4,
		begins	: $.cal.date().addDays(4).format('Y-m-d')+' 11:30:00',
		ends	: $.cal.date().addDays(4).format('Y-m-d')+' 12:30:00',
		color	: '#990066',
		notes	: 'The big game'
	},
	{
		uid		: 5,
		begins	: $.cal.date().addDays(4).format('Y-m-d')+' 12:30:00',
		ends	: $.cal.date().addDays(4).format('Y-m-d')+' 12:45:00',
		notes	: 'Good-O'
	}
];
