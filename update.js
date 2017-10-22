// Copyright 2017 Piotr Marczyński

"use strict";

const WIDTH = 1200;
const HEIGHT = 675;
const SIZE_RATIO = 0.3; // [cm/px] Liczba cm wyświetlanych na długości 1 px
const UPS = 60; // [1/s] liczba aktualizacji na sekundę 
const WHEELBASE = 258; // [cm] rozstaw osi
const MAX_TURN_ANGLE = 0.60; // [rad] maksymalny kąt skrętu przedniej osi
const ACCELERATION = 500; // [cm/s^2] przyspieszenie samochodu
const VELOCITY_LOSS = 0.075; // [1/s] część prędkości, jaką samochód utraci w czasie 1 sekundy
const TURN_SPEED_REDUCTION = 0.0005; // większa liczba - silniejsze ograniczenie prędkości obrotu przedniej osi przy dużej prędkości samochodu
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
	pos_x: WIDTH/2/SIZE_RATIO, // [cm] położenie samochodu od lewego dolnego rogu układu odniesienia. Obowiązuje kartezjański układ współrzędnych.
	pos_y: HEIGHT/4/SIZE_RATIO, // [cm]
	pos_rot: 0, // [rad] kąt obrotu samochodu względem układu odniesienia
	axis_rot: 0, // [rad] kąt obrotu osi przedniej względem osi tylniej
	vel: 0, // [cm/s] chwilowa prędkość samochodu
	accel: 0, // [cm/s^2] chwilowe przyspieszenie samochodu
	turn_radius: Infinity, // [cm] promień skrętu
};

var controls = {
	forward: false,
	backward: false,
	right: false,
	left: false,
	right_precise: false,
	left_precise: false
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
			car.axis_rot += turn_dir * TURN_SPEED * Math.exp(- Math.abs(car.vel) * TURN_SPEED_REDUCTION) / UPS;
		}
	}
	
	// Obsługa klawiatury - skręcanie precyzyjne
	
	if(controls.right_precise ^ controls.left_precise) {
		var turn_dir = 1 - 2*controls.left_precise;
		if(Math.abs(car.axis_rot + turn_dir * TURN_SPEED_PRECISE / UPS) > MAX_TURN_ANGLE) {
			car.axis_rot = turn_dir * MAX_TURN_ANGLE;
		}
		else {
			car.axis_rot += turn_dir * TURN_SPEED_PRECISE * Math.exp(- Math.abs(car.vel) * TURN_SPEED_REDUCTION) / UPS;
		}
	}
	
	// Obliczenie zmiany położenia
	
	if(Math.abs(car.vel) < CONSTANT_FRICTION / UPS) {
		car.vel = 0;
	}
	else {
		car.vel *= 1 - VELOCITY_LOSS / UPS;
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
	if(typeof e.data.key !== 'undefined') {
		if(typeof KEYS[e.data.key] !== 'undefined') {
			controls[KEYS[e.data.key]] = e.data.pressing;
		}
	}
	else {
		if(!e.data.focus) {
			controls.forward = false;
			controls.backward = false;
			controls.right = false;
			controls.left = false;
			controls.right_precise = false;
			controls.left_precise = false;
		}
	}
};

this.addEventListener("message", recieveHandler, false);

(function() {
	setInterval(update, 1000 / UPS);
})();
