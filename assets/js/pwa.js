const pwa = {

	// vars
	'useragent':	'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/19F77 [FBAN/FBIOS;FBDV/iPhone11,8;FBMD/iPhone;FBSN/iOS;FBSV/15.5;FBSS/2;FBID/phone;FBLC/en_US;FBOP/5]',
	'radio_id':		'',
	'claim_token':	'',

	'init':			function()
					{
						// register serviceworker if possible
						if( 'serviceWorker' in navigator )
						{
							navigator.serviceWorker.register('./sw.js')
							.catch(function(error)
							{
								console.log('sw.js failed with ' + error);
							});
						}

						// check for connectivity
						pwa.conncheck();

						// watch connectivity
						window.addEventListener('online',	pwa.conncheck);
						window.addEventListener('offline',	pwa.conncheck);

						// check for proxy
						if( pwa.dialog != 'offline' )
							pwa.proxycheck();
					},

	'conncheck':	function()
					{
						if( !navigator.onLine )
							pwa.open('offline');
					},

	'proxycheck':	function()
					{
						pwa.fetch('')
						.then(function(response)
						{
							// search for access
							if( response.status == 200 )
							{
								// open 'begin' dialog
								pwa.open('begin');
							}
							else
							{
								// open proxy dialog
								pwa.open('proxy');

								// check again in 3 seconds
								setTimeout(pwa.proxycheck, 3000);
							}
						});
					},

	'fetch':		function( url, args )
					{
						// wrap all requests through cors-anywhere
						return fetch('https://cors-anywhere.herokuapp.com/' + url, args);
					},

	'dialog':		'default',
	'open':			function( set_dialog )
					{
						// unset current
						if( pwa.dialog )
							document.querySelector('dialog#app-'+pwa.dialog).removeAttribute('open');

						// set current
						document.querySelector('dialog#app-'+set_dialog).setAttribute('open', 'open');
						pwa.dialog = set_dialog;
					},

	'error':		function( msg )
					{
						document.getElementById('errmsg').innerHTML = msg;
						pwa.open('error');
					},

	'process':		function()
					{
						// get radio id
						pwa.radio_id = document.getElementById('radio_id').value;

						// check radio id is valid
						if( !pwa.radio_id )
						{
							pwa.error('You must enter a Radio ID.');
							return false;
						}

						// open 'processing'
						pwa.open('processing');

						// get claim token
						pwa.p_claimtoken();
					},

	'p_claimtoken':	function()
					{
						pwa.fetch(	'https://mcare.siriusxm.ca/authService/100000002/login',
									{
										'method':	'POST',
										'headers':	{
														'Accept': 'application/json',
														'Content-Type': 'application/x-www-form-urlencoded',
														'X-Kony-App-Secret': 'e3048b73f2f7a6c069f7d8abf5864115',
														'X-Kony-App-Key': '85ee60a3c8f011baaeba01ff3a5ae2c9',
														'X-Kony-Platform-Type': 'ios'
													}
									})
						.then(response=>response.json())
						.then(function(response)
						{
							if( response.claims_token.value )
							{
								pwa.claim_token = response.claims_token.value;
								pwa.p_trialacc();
							}
							else
							{
								pwa.error('Error fetching claims token.');
								console.log(response);
							}
						});
					},

	'p_trialacc':	function()
					{
						pwa.fetch(	'https://mcare.siriusxm.ca/services/DealerAppService3/CreateAccount',
									{
										'method':	'POST',
										'body':		'deviceId=' + encodeURIComponent(pwa.radio_id),
										'headers':	{
														'X-Kony-Authorization': pwa.claim_token,
														'Content-Type': 'application/x-www-form-urlencoded',
														'X-Kony-API-Version': '1.0',
														'X-Kony-Platform-Type': 'ios',
														'Accept': '*/*'
													}
									})
						.then(response=>response.json())
						.then(function(response)
						{
							if( response.httpStatusCode == 200 )
							{
								pwa.p_activate();
							}
							else
							{
								pwa.error('Error fetching creating trial account.');
								console.log(response);
							}
						});
					},

	'p_activate':	function()
					{
						pwa.fetch(	'https://mcare.siriusxm.ca/services/USUpdateDeviceSATRefresh/updateDeviceSATRefreshWithPriority',
									{
										'method':	'POST',
										'body':		'deviceId=' + encodeURIComponent(pwa.radio_id),
										'headers':	{
														'X-Kony-Authorization': pwa.claim_token,
														'Content-Type': 'application/x-www-form-urlencoded',
														'X-Kony-API-Version': '1.0',
														'X-Kony-Platform-Type': 'ios',
														'Accept': 'application/x-www-form-urlencoded'
													}
									})
						.then(response=>response.json())
						.then(function(response)
						{
							if( response.httpStatusCode == 200 && response.seqValue )
							{
								pwa.open('success');
							}
							else
							{
								pwa.error('Error activating.');
								console.log(response);
							}
						});
					}
};
