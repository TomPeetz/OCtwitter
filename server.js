var app 	=require('express')();
var http	=require('http').Server(app);
var io		=require('socket.io')(http);

const port = 9090;

rounds = [{ selectionPlayer1: undefined, selectionPlayer2: undefined, winner: undefined },
          { selectionPlayer1: undefined, selectionPlayer2: undefined, winner: undefined },
          { selectionPlayer1: undefined, selectionPlayer2: undefined, winner: undefined }
         ];
		 
round = 0;
		 
player1 = {
  socket: undefined,
  name: undefined,
  number: 1,
  score: 0,
  reserved: undefined,
  next_round: 0
}

player2 = {
  socket: undefined,
  name: undefined,
  number: 2,
  score: 0,
  reserved: undefined,
  next_round: 0
}

observer = {
	socket: undefined
}

io.on('connection', function(socket) {
	log('io:connection');

// Der Observer wird angemeldet (max. 1)
	socket.on('Observer', function(){
		if (observer.socket === undefined) {
			observer.socket = socket;
			log('socket:connect Observer');
			observer.socket.emit('event', 'Als offizieller Zuschauer angemeldet!');
		} else {
			log('socket:already an observer');
			socket.emit('fehler','zu viele observer');
		};
	});

// Ein Spieler, der noch nicht gegen die Datenbank gecheckt ist, reserviert seinen Slot
	socket.on('check Login', function(msg) {
		if (player1.socket === socket) {
			log('socket:already logged in as Player1: ' + player1.name);
			socket.emit('Login ok', { check: 0, pnr: 0 });
		} else if (player2.socket === socket) {
			log('socket:already logged in as Player2: ' + player2.name);
			socket.emit('Login ok', { check: 0, pnr: 0 });
		} else if (player1.name === msg || player2.name === msg) {
			log('socket:Name already taken: ' + msg);
			socket.emit('Login ok', { check: -2, pnr: 0 });
		} else {
			if (player1.socket === undefined) {
				player1.socket = socket;
				player1.name = msg;
				player1.reserved = 1;
				socket.emit('Login ok', { check: 1, pnr: 1 });
				log('socket:Player 1 slot reserved for: ' + msg);
			} else if (player2.socket === undefined) {
				player2.socket = socket;
				player2.name = msg;
				player2.reserved = 1;
				socket.emit('Login ok', { check: 1, pnr: 2 });
				log('socket:Player 2 slot reserved for: ' + msg);
			} else {
				socket.emit('Login ok', { check: -1, pnr: 0 });
				log('socket:Login failed: already enough players');
			}
		}
		
		
	});

// Ein Spieler hat sich gegen die Datenbank angemeldet und wird auch im Server eingetragen
	socket.on('Login', function(msg) {
		if (player1.socket === socket) {
			log('socket:already logged in as Player1: ' + player1.name);
			socket.emit('Login ok', { check: 0, pnr: 0 });
		} else if (player2.socket === socket) {
			log('socket:already logged in as Player2: ' + player2.name);
			socket.emit('Login ok', { check: 0, pnr: 0 });
		} else if (player1.name === msg || player2.name === msg) {
			log('socket:Name already taken: ' + msg);
			socket.emit('Login ok', { check: -2, pnr: 0 });
		} else {
			if (player1.socket === undefined) {
				player1.socket = socket;
				player1.name = msg;
				player1.reserved = undefined;
				socket.emit('Login ok', { check: 1, pnr: 1 });
				log('socket:Player 1 logged in as: ' + msg);
				io.emit('player_logged_in', { pnr: 1, name: player1.name } );
				if (player2.socket != undefined) {
					socket.emit('player_logged_in', { pnr: 2, name: player2.name } );
					emit_all('go next', { round: round+1, score: '0 : 0'} )
				}
			} else if (player2.socket === undefined) {
				player2.socket = socket;
				player2.name = msg;
				player2.reserved = undefined;
				socket.emit('Login ok', { check: 1, pnr: 2 });
				log('socket:Player 2 logged in as: ' + msg);
				io.emit('player_logged_in', { pnr: 2, name: player2.name } );
				if (player1.socket != undefined) {
					socket.emit('player_logged_in', { pnr: 1, name: player1.name } );
					emit_all('go next', { round: round+1, score: '0 : 0'} )
				}
			} else {
				socket.emit('Login ok', { check: -1, pnr: 0 });
				log('socket:Login failed: already enough players');
			}
		}
		
		
	});

// Ein Spieler hat eine Auswahl getroffen
	socket.on('Selection', function(data) {
		//log('Selection: ' + data);
		if (player1.socket === socket) {
			if (observer.socket != undefined) {
				observer.socket.emit('choice', { pnr: 1, choice: data } );
				log('P1: ' + data);
			}
			rounds[round].selectionPlayer1 = data;
		} else if (player2.socket === socket) {
			if (observer.socket != undefined) {
				observer.socket.emit('choice', { pnr: 2, choice: data } );
				log('P1: ' + data);
			}
			rounds[round].selectionPlayer2 = data;
		}
		socket.emit('disable_btns', '');
		
		// Beide Spieler haben gewählt
		if (rounds[round].selectionPlayer1 != undefined && rounds[round].selectionPlayer2 != undefined) {
			if (rounds[round].selectionPlayer1 == rounds[round].selectionPlayer2) {
				rounds[round].winner = 0;
			} else if(	(rounds[round].selectionPlayer1 == 'Schere' && rounds[round].selectionPlayer2 == 'Papier') ||
						(rounds[round].selectionPlayer1 == 'Schere' && rounds[round].selectionPlayer2 == 'Echse')  ||
						(rounds[round].selectionPlayer1 == 'Stein'  && rounds[round].selectionPlayer2 == 'Schere') ||
						(rounds[round].selectionPlayer1 == 'Stein'  && rounds[round].selectionPlayer2 == 'Echse')  ||
						(rounds[round].selectionPlayer1 == 'Papier' && rounds[round].selectionPlayer2 == 'Stein')  ||
						(rounds[round].selectionPlayer1 == 'Papier' && rounds[round].selectionPlayer2 == 'Spock')  ||
						(rounds[round].selectionPlayer1 == 'Echse'  && rounds[round].selectionPlayer2 == 'Papier') ||
						(rounds[round].selectionPlayer1 == 'Echse'  && rounds[round].selectionPlayer2 == 'Spock')  ||
						(rounds[round].selectionPlayer1 == 'Spock'  && rounds[round].selectionPlayer2 == 'Stein')  ||
						(rounds[round].selectionPlayer1 == 'Spock'  && rounds[round].selectionPlayer2 == 'Schere') ) {
				rounds[round].winner = 1;
				player1.score++;
			} else {
				rounds[round].winner = 2;
				player2.score++;
			}
			log('P1: ' + rounds[round].selectionPlayer1 + ',  P2: ' + rounds[round].selectionPlayer2 + ', Winner is: ' + rounds[round].winner);
			emit_all('show_result', {p1 : rounds[round].selectionPlayer1, 
									p2 : rounds[round].selectionPlayer2, 
									winner: rounds[round].winner, 
									score: player1.score + ':' + player2.score,
									round: round+1 } );
			
			
			// Alle Runden sind gespielt
			if (rounds[round].winner != 0) {
				if (round == 2) {
					if (player1.score > player2.score) {
						emit_all('game done', { p1_score : player1.score, p2_score : player2.score, winner: 1} );
						reset_game();
					} else {
						emit_all('game done', { p1_score : player1.score, p2_score : player2.score, winner: 2} );
						reset_game();
					}
				} else {
					round++;
					setTimeout(function() {
					log('emit next round: ' + round);
					emit_all('go next', { round: round+1, score: player1.score + ':' + player2.score } );
					}, 5000);
				}
			} else {
				rounds[round].selectionPlayer1 = undefined;
				rounds[round].selectionPlayer2 = undefined;
				rounds[round].winner = undefined;
				setTimeout(function() {
					log('emit next round: ' + round);
				emit_all('go next', { round: round+1, score: player1.score + ':' + player2.score } );
				}, 5000);
			}
		}
	});

// Einer der Spieler will die nächste Runde starten - wenn beide gedrückt haben, geht's weiter
	socket.on('next round', function() {
		
		
		/*if (player1.socket === socket && player1.next_round == 0) {
			log('player 1: next turn');
			if (player2.next_round == 1) {
				emit_all('go next', { round: round+1, score: player1.score + ':' + player2.score } );
				player2.next_round = 0;
			} else {
				player1.next_round = 1;
			}
		} else if (player2.socket === socket && player2.next_round == 0) {
			log('player 2: next turn');
			if (player1.next_round == 1) {
				emit_all('go next', { round: round+1, score: player1.score + ':' + player2.score } );
				player1.next_round = 0;
			} else {
				player2.next_round = 1;
			}
		}
		*/
		//log('Nächste Runde ist Runde Nr: ' + round + ' (Nummer im Array)');
	});
	


// Ein Client disconnected
	socket.on('disconnect', function() {
		disconnect(socket);
		socket.disconnect();
	});
});

http.listen(port, function() {
	log('listening on *:'+port);
});

function log(msg) {
	console.log(/*new Date()+" "+*/msg);
}

// emit to all players and observer
function emit_all(type, msg) {
	log('emit_all: ' + type + ' + msg: ' + msg);
	if (observer.socket != undefined) observer.socket.emit(type, msg);
	if (player1.socket 	!= undefined) player1.socket.emit(type, msg);
	if (player2.socket 	!= undefined) player2.socket.emit(type, msg);
}

// nach Spiel alles zurück setzen
function reset_game() {
	setTimeout(function() {
		log('send reset');
		emit_all('go_to_home','');
		
		round = 0;
					
		for (i = 0; i < 3; i++) {
			rounds[i].selectionPlayer1 = undefined;
			rounds[i].selectionPlayer2 = undefined;
			rounds[i].winner = undefined;
		}
		
		//player1.socket.disconnect();
		//player2.socket.disconnect();
			
		player1.socket 		= undefined;
		player1.name		= undefined;
		player1.score		= 0;
		player1.reserved	= undefined;
		player1.next_round	= 0;
		
		player2.socket 		= undefined;
		player2.name		= undefined;
		player2.score		= 0;
		player2.reserved	= undefined;
		player2.next_round	= 0;		
		
	}, 5000);
	
	
};

//spieler disconnecten
function disconnect(socket) {
	if (player1.socket === socket) {
		log('socket:disconnect player ' + player1.name);
		if (player1.reserved == 1) {
			player1.socket 		= undefined;
			player1.name		= undefined;
			player1.score		= 0;
			player1.reserved	= undefined;
			player1.next_round	= 0;
		} else {
			emit_all('stop game', 1);
			reset_game();
		}
	} else if (player2.socket === socket) {
		log('socket:disconnect player ' + player2.name);
		if (player2.reserved == 1) {
			player2.socket 		= undefined;
			player2.name		= undefined;
			player2.score		= 0;
			player2.reserved	= undefined;
			player2.next_round	= 0;
		} else {
			emit_all('stop game', 2);
			reset_game();
		}
	} else if (observer.socket === socket) {
		log ('socket:disconnect observer');
		observer.socket = undefined;
		emit_all('stop game', 0);
		reset_game();
	} else {
		log('socket:disconnect no player');
	}
};