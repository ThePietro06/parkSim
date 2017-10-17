// Copyright 2017 Piotr Marczyński

"use strict";

const WIDTH = 1200;
const HEIGHT = 675;
const SIZE_RATIO = 0.3; // [cm/px] Liczba cm wyświetlanych na długości 1 px
const UPS = 60; // [1/s] liczba aktualizacji na sekundę 
const WHEELBASE = 258; // [cm] rozstaw osi
const MAX_TURN_ANGLE = 0.60; // [rad] maksymalny kąt skrętu przedniej osi
const ACCELERATION = 800; // [cm/s^2] przyspieszenie samochodu
const TRACTION_CONTROL = 0.0005; // Większa liczba - silniejsze ograniczenie prędkości obrotu przedniej osi przy dużej prędkości samochodu
const CONSTANT_FRICTION = 100; // [cm/s] stały ubytek prędkości
const BREAKING_FRICTION = 1000; // [cm/s] ubytek prędkości wskutek hamowania
const EMERGENCY_BREAKING_FRICTION = 3000; // [cm/s] ubytek prędkości wskutek hamowania awaryjnego
const TURN_SPEED = 1; // [rad/s] prędkość obrotu przedniej osi podczas postoju
const TURN_SPEED_PRECISE = 0.3; // [rad/s] prędkość obrotu przedniej osi podczas postoju przy prezycyjnym sterowaniu

const KEYS = {
	w: 'forward',
	W: 'forward',
	ArrowUp: 'forward',
	s: 'backward',
	S: 'backward',
	ś: 'backward',
	Ś: 'backward',
	ArrowDown: 'backward',
	a: 'left',
	A: 'left',
	ą: 'left',
	Ą: 'left',
	ArrowLeft: 'left',
	d: 'right',
	D: 'right',
	ArrowRight: 'right',
	q: 'left_precise',
	Q: 'left_precise',
	e: 'right_precise',
	E: 'right_precise',
	ę: 'right_precise',
	Ę: 'right_precise'
};

var car = {
	pos_x: WIDTH/2/SIZE_RATIO, // Położenie samochodu wyrażone jest w cm od lewego dolnego rogu. Obowiązuje kartezjański układ współrzędnych.
	pos_y: HEIGHT/3/SIZE_RATIO,
	pos_rot: 0,
	axis_rot: 0,
	vel: 0,
	accel: 0,
	turn_radius: Infinity
};

var controls = {
	forward: 0,
	backward: 0,
	right: 0,
	left: 0,
	right_precise: 0,
	left_precise: 0
};

var update = function(e) {
	// Obsługa klawiatury - przyspieszanie i zwalnianie
	
	if(!controls.forward && !controls.backward) { // ani [w] ani [s]
		car.accel = 0;
	}
	else if(controls.forward && controls.backward) { // jednocześnie [w] i [s]
		if(Math.abs(car.vel) < EMERGENCY_BREAKING_FRICTION / UPS) {
			car.vel = 0;
			car.accel = 0;
		}
		else {
			car.vel -= Math.sign(car.vel) * EMERGENCY_BREAKING_FRICTION / UPS;
		}
	}
	else if(controls.forward && car.vel < 0 || controls.backward && car.vel > 0) { // [w] lub [s], ale przeciwnie do kierunku jazdy
		if(Math.abs(car.vel) < BREAKING_FRICTION / UPS) {
			car.vel = 0;
			car.accel = 0;
		}
		else {
			car.vel -= Math.sign(car.vel) * BREAKING_FRICTION / UPS;
		}
	}
	else if(controls.forward) { // [w]
		car.accel = ACCELERATION;
	}
	else if(controls.backward) { // [s]
		car.accel = -ACCELERATION;
	}
	
	// Obsługa klawiatury - skręcanie zgrubne
	
	if(controls.right ^ controls.left) {
		var turn_dir = 1 - 2*controls.left;
		if(Math.abs(car.axis_rot + turn_dir * TURN_SPEED / UPS) > MAX_TURN_ANGLE) {
			car.axis_rot = turn_dir * MAX_TURN_ANGLE;
		}
		else {
			car.axis_rot += turn_dir * TURN_SPEED * Math.exp(- Math.abs(car.vel) * TRACTION_CONTROL) / UPS;
		}
	}
	
	// Obsługa klawiatury - skręcanie precyzyjne
	
	if(controls.right_precise ^ controls.left_precise) {
		var turn_dir = 1 - 2*controls.left_precise;
		if(Math.abs(car.axis_rot + turn_dir * TURN_SPEED_PRECISE / UPS) > MAX_TURN_ANGLE) {
			car.axis_rot = turn_dir * MAX_TURN_ANGLE;
		}
		else {
			car.axis_rot += turn_dir * TURN_SPEED_PRECISE * Math.exp(- Math.abs(car.vel) * TRACTION_CONTROL) / UPS;
		}
	}
	
	// Obliczenie zmiany położenia
	
	if(Math.abs(car.vel) < CONSTANT_FRICTION / UPS) {
		car.vel = 0;
	}
	else {
		car.vel -= Math.sign(car.vel) * CONSTANT_FRICTION / UPS;
	}
	car.vel += car.accel / UPS;
	
	var linear_displacement = car.vel / UPS;
	
	// Obliczenie toru ruchu
	
	if(car.axis_rot) {
		car.turn_radius = WHEELBASE / Math.tan(car.axis_rot);
		var pos_rot_displacement = linear_displacement / car.turn_radius;
		var displacement = car.turn_radius * Math.tan(pos_rot_displacement);
		car.pos_rot += pos_rot_displacement;
		car.pos_x += displacement * Math.sin(car.pos_rot);
		car.pos_y += displacement * Math.cos(car.pos_rot);
	}
	else {
		car.turn_radius = Infinity;
		car.pos_x += linear_displacement * Math.sin(car.pos_rot);
		car.pos_y += linear_displacement * Math.cos(car.pos_rot);
	}
	
	// Wysłanie danych
	
	postMessage(car);
};


var recieveHandler = function(e) {
	if(typeof KEYS[e.data.key] !== 'undefined')
		controls[KEYS[e.data.key]] = e.data.pressing;
};

this.addEventListener("message", recieveHandler, false);

(function() {
	setInterval(update, 1000 / UPS);
})();
