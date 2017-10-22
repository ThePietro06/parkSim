// Copyright 2017 Piotr Marczyński

"use strict";

const WIDTH = 1200; // [px]
const HEIGHT = 675; // [px]
const DIAGONAL = Math.sqrt(WIDTH*WIDTH+HEIGHT*HEIGHT); // [px]
const SIZE_RATIO = 0.3; // [cm/px] Liczba cm wyświetlanych na długości 1 px
const MIN_TRAILED_TURN_ANGLE = 0.01;
const MAX_TURN_ANGLE = 0.60;
const CAR_POS_X_FIXED_CAMERA = WIDTH/2; // [px] Pozycja auta na ekranie od lewej krawędzi przy kamerze śledzącej auto 
const CAR_POS_Y_FIXED_CAMERA = HEIGHT/3; // [px] Pozycja auta na ekranie od dolnej krawędzi przy kamerze śledzącej auto

const WHEELBASE = 258; // [cm] rozstaw osi
const CAR_WIDTH = 165; // [cm]
const CAR_LENGTH = 382; // [cm]
const CAR_BODY_OFFSET_LEFT = -CAR_WIDTH/2; // [cm]
const CAR_BODY_OFFSET_TOP = -328; // [cm]

Math.square = function(a) {
	return a * a;
};

function Car(canvas) {
	this.pos_x = WIDTH/2/SIZE_RATIO; // [cm] położenie samochodu od lewego dolnego rogu układu odniesienia. Obowiązuje kartezjański układ współrzędnych.
	this.pos_y = HEIGHT/4/SIZE_RATIO; // [cm]
	this.vel = 0; // [cm/s] chwilowa prędkość samochodu
	this.pos_rot = 0; // [rad] kąt obrotu samochodu względem układu odniesienia
	this.axis_rot = 0; // [rad] kąt obrotu osi przedniej względem osi tylniej
	this.turn_radius = 0; // [cm] promień skrętu
	this.updateWorker;
	this.html = {
		body_wrapper: document.createElement('div'),
		body: document.createElement('div')
	};
	
	this.updatePos = function() {
		if(canvas.car == this) {
			if(canvas.fixed_camera) {
				canvas.html.markings_wrapper.style['bottom'] = SIZE_RATIO*this.pos_y+'px';
				canvas.html.markings_wrapper.style['left'] = SIZE_RATIO*this.pos_x+'px';
				canvas.html.markings_wrapper.style['transform'] = 'rotate('+this.pos_rot+'rad)';
			}
			else {
				canvas.html.outer_wrapper.style['bottom'] = canvas.html.background.style['bottom'] = (CAR_POS_Y_FIXED_CAMERA - SIZE_RATIO*canvas.car.pos_y) + 'px';
				canvas.html.outer_wrapper.style['left'] = canvas.html.background.style['left'] = (CAR_POS_X_FIXED_CAMERA - SIZE_RATIO*canvas.car.pos_x) + 'px';
				canvas.html.outer_wrapper.style['transform-origin'] = canvas.html.background.style['transform-origin'] = (SIZE_RATIO*canvas.car.pos_x) + 'px ' + (HEIGHT - SIZE_RATIO*canvas.car.pos_y) + 'px';
				canvas.html.outer_wrapper.style['transform'] = canvas.html.background.style['transform'] = 'rotate('+(-canvas.car.pos_rot)+'rad)';
			}
		
			canvas.html.front_axis.style['transform'] = 'rotate('+this.axis_rot+'rad)';
			canvas.html.speedometer.innerHTML = (this.vel * 0.036).toFixed(0) + " km/h";
		
			var axis_rot_abs = Math.abs(this.axis_rot);
			if(canvas.show_trail && axis_rot_abs > MIN_TRAILED_TURN_ANGLE) {
				var radius_abs = Math.abs(this.turn_radius); // [cm]
				var trail_inner_bound = radius_abs + CAR_BODY_OFFSET_LEFT; // [cm]
				var trail_outer_bound = Math.sqrt(Math.square(radius_abs - CAR_BODY_OFFSET_LEFT) + Math.square(CAR_BODY_OFFSET_TOP * 0.85)); // [cm]
				var trail_width = trail_outer_bound - trail_inner_bound; // [cm]
				canvas.html.trail.style['width'] = trail_outer_bound * SIZE_RATIO * 2 + 'px';
				canvas.html.trail.style['height'] = trail_outer_bound * SIZE_RATIO * 2 + 'px';
				canvas.html.trail.style['border-width'] = trail_width * SIZE_RATIO + 'px';
				if(this.turn_radius > 0) {
					canvas.html.trail.style['left'] = (- trail_width - CAR_BODY_OFFSET_LEFT) * SIZE_RATIO + 'px';
					canvas.html.trail.style['right'] = 'auto';
				}
				else {
					canvas.html.trail.style['left'] = 'auto';
					canvas.html.trail.style['right'] = (- trail_width - CAR_BODY_OFFSET_LEFT) * SIZE_RATIO + 'px';
				}
				canvas.html.trail.style['top'] = - trail_outer_bound * SIZE_RATIO + 'px';
				canvas.html.trail.style['opacity'] = (axis_rot_abs - MIN_TRAILED_TURN_ANGLE) / MAX_TURN_ANGLE * 0.1;
				canvas.html.trail.style['display'] = 'block';
			}
			else {
				canvas.html.trail.style['display'] = 'none';
			}
		}
		if(canvas.car != this || canvas.fixed_camera) {
			this.html.body_wrapper.style['bottom'] = SIZE_RATIO*this.pos_y+'px';
			this.html.body_wrapper.style['left'] = SIZE_RATIO*this.pos_x+'px';
			this.html.body_wrapper.style['transform'] = 'rotate('+this.pos_rot+'rad)';
		}
		if(this.updateWorker)
			window.requestAnimationFrame(this.updatePos);
	}.bind(this);
	
	this.focus = function() {
		canvas.car = this;
	}.bind(this);
	
	this.recieveHandler = function(e) {
		this.pos_x = e.data.pos_x;
		this.pos_y = e.data.pos_y;
		this.vel = e.data.vel;
		this.pos_rot = e.data.pos_rot;
		this.axis_rot = e.data.axis_rot;
		this.turn_radius = e.data.turn_radius;
	}.bind(this);
	
	this.destroy = function() {
		this.html.body_wrapper.removeEventListener("click", this.focus);
		this.updateWorker.removeEventListener("message", this.recieveHandler);
		this.updateWorker.terminate();
		this.html.body.parentNode.removeChild(this.html.body);
		this.html.body_wrapper.parentNode.removeChild(this.html.body_wrapper);
		this.updateWorker = null;
		canvas.car = null;
	}.bind(this);
	
	this.updateWorker = new Worker("update.js");
	this.updateWorker.addEventListener("message", this.recieveHandler, false);
	
	canvas.html.outer_wrapper.appendChild(this.html.body_wrapper);
	this.html.body_wrapper.appendChild(this.html.body);
	this.html.body_wrapper.style['position'] = 'absolute';
	this.html.body_wrapper.style['width'] = '0px';
	this.html.body_wrapper.style['height'] = '0px';
	this.html.body_wrapper.style['bottom'] = '0px';
	this.html.body_wrapper.style['left'] = '0px';
	this.html.body_wrapper.style['z-index'] = '3';
	this.html.body.style['position'] = 'absolute';
	this.html.body.style['width'] = SIZE_RATIO*CAR_WIDTH+'px';
	this.html.body.style['height'] = SIZE_RATIO*CAR_LENGTH+'px';
	this.html.body.style['left'] = SIZE_RATIO*CAR_BODY_OFFSET_LEFT+'px';
	this.html.body.style['top'] = SIZE_RATIO*CAR_BODY_OFFSET_TOP+'px';
	this.html.body.style['background-size'] = '100% 100%';
	this.html.body.style['background-repeat'] = 'no-repeat';
	this.html.body.style['background-image'] = 'url("img/corsa.svg")';
	
	this.html.body_wrapper.addEventListener("click", this.focus, false);
	
	this.updatePos();
}

function Canvas(ui) {
	this.html = {
		parking_lot: ui.parking_lot,
		speedometer: ui.speedometer,
		background: document.createElement('img'),
		outer_wrapper: document.createElement('div'),
		markings_wrapper: document.createElement('div'),
		trail: document.createElement('div'),
		back_axis: document.createElement('div'),
		front_axis: document.createElement('div')
	};
	this.show_trail;
	let car;
	let fixed_camera;
	
	Object.defineProperty(this, 'car', {
		set: function(new_car) {
			if(car != new_car) {
				if(car) {
					car.html.body_wrapper.style['cursor'] = 'pointer';
					car.html.body_wrapper.style['z-index'] = '3';
					if(car.updateWorker) {
						car.updateWorker.postMessage({focus: false});
					}
					if(!fixed_camera) {
						this.html.outer_wrapper.appendChild(car.html.body_wrapper);
						this.html.outer_wrapper.appendChild(this.html.markings_wrapper);
					}
				}
				if(new_car) {
					new_car.html.body_wrapper.style['cursor'] = '';
					new_car.html.body_wrapper.style['z-index'] = '4';
					this.html.markings_wrapper.style['display'] = 'block';
				}
				else {
					this.html.markings_wrapper.style['display'] = 'none';
				}
				car = new_car;
				this.fixed_camera = this.fixed_camera; // Jeśli jest ustawiona kamera podążająca za samochodem, należy ustawić samochód w odpowiednim miejscu na ekranie
			}
		},
		get: function() {
			return car;
		}
	});
	
	Object.defineProperty(this, 'fixed_camera', {
		set: function(fixed) {
			fixed_camera = fixed;
			if(fixed_camera) {
				this.html.outer_wrapper.appendChild(this.html.markings_wrapper);
				if(this.car)
					this.html.outer_wrapper.appendChild(this.car.html.body_wrapper);
				this.html.outer_wrapper.style['left'] = this.html.background.style['left'] = '0px';
				this.html.outer_wrapper.style['bottom'] = this.html.background.style['bottom'] = '0px';
				this.html.outer_wrapper.style['transform'] = this.html.background.style['transform'] = 'none';
			}
			else {
				this.html.parking_lot.appendChild(this.html.markings_wrapper);
				if(this.car) {
					this.html.parking_lot.appendChild(this.car.html.body_wrapper);
					this.car.html.body_wrapper.style['left'] = this.html.markings_wrapper.style['left'] = CAR_POS_X_FIXED_CAMERA+'px';
					this.car.html.body_wrapper.style['bottom'] = this.html.markings_wrapper.style['bottom'] = CAR_POS_Y_FIXED_CAMERA+'px';
					this.car.html.body_wrapper.style['transform'] = this.html.markings_wrapper.style['transform'] = 'none';
				}
			}
		},
		get: function() {
			return fixed_camera;
		}
	});

	this.updateTrailVisibility = function() {
		this.show_trail = ui.show_trail_checkbox.checked;
	}.bind(this);
	ui.show_trail_checkbox.addEventListener("change", this.updateTrailVisibility, false);

	this.updateCameraPosition = function() {
		this.fixed_camera = ui.fix_camera_checkbox.checked;
	}.bind(this);
	ui.fix_camera_checkbox.addEventListener("change", this.updateCameraPosition, false);

	this.addCar = function() {
		this.car = new Car(this);
	}.bind(this);
	ui.add_car_button.addEventListener("click", this.addCar, false);

	this.removeCar = function() {
		this.car.destroy();
	}.bind(this);
	ui.remove_car_button.addEventListener("click", this.removeCar, false);

	this.keydownHandler = function(e) {
		if(this.car)
			this.car.updateWorker.postMessage({pressing: true, key: e.key});
	}.bind(this);

	this.keyupHandler = function(e) {
		if(this.car)
			this.car.updateWorker.postMessage({pressing: false, key: e.key});
	}.bind(this);
	
	this.html.parking_lot.style['background-color'] = '#b3b3b3';
	this.html.parking_lot.appendChild(this.html.background);
	this.html.background.src = 'img/parking-lot.svg';
	this.html.background.style['position'] = 'absolute';
	this.html.background.style['width'] = '100%';
	this.html.background.style['height'] = '100%';
	this.html.background.style['bottom'] = '0px';
	this.html.background.style['left'] = '0px';
	this.html.background.style['z-index'] = '1';
	this.html.parking_lot.appendChild(this.html.outer_wrapper);
	this.html.outer_wrapper.style['position'] = 'absolute';
	this.html.outer_wrapper.style['width'] = '100%';
	this.html.outer_wrapper.style['height'] = '100%';
	this.html.outer_wrapper.style['bottom'] = '0px';
	this.html.outer_wrapper.style['left'] = '0px';
	this.html.outer_wrapper.style['z-index'] = '3';
	this.html.outer_wrapper.appendChild(this.html.markings_wrapper);
	this.html.markings_wrapper.style['position'] = 'absolute';
	this.html.markings_wrapper.style['width'] = '0px';
	this.html.markings_wrapper.style['height'] = '0px';
	this.html.markings_wrapper.style['bottom'] = '0px';
	this.html.markings_wrapper.style['left'] = '0px';
	this.html.markings_wrapper.style['z-index'] = '2';
	this.html.markings_wrapper.appendChild(this.html.trail);
	this.html.trail.style['display'] = 'none';
	this.html.trail.style['position'] = 'absolute';
	this.html.trail.style['border-radius'] = '100%';
	this.html.trail.style['border-color'] = '#f00';
	this.html.trail.style['border-style'] = 'solid';
	this.html.trail.style['box-sizing'] = 'border-box';
	this.html.markings_wrapper.appendChild(this.html.back_axis);
	this.html.back_axis.style['position'] = 'relative';
	this.html.back_axis.style['width'] = DIAGONAL*2+'px';
	this.html.back_axis.style['height'] = '0px';
	this.html.back_axis.style['border-top'] = '2px dashed rgba(255, 0, 0, 0.3)';
	this.html.back_axis.style['left'] = -DIAGONAL+'px';
	this.html.back_axis.style['top'] = '0px';
	this.html.markings_wrapper.appendChild(this.html.front_axis);
	this.html.front_axis.style['position'] = 'absolute';
	this.html.front_axis.style['width'] = DIAGONAL*2+'px';
	this.html.front_axis.style['height'] = '0px';
	this.html.front_axis.style['border-top'] = '2px dashed rgba(255, 0, 0, 0.3)';
	this.html.front_axis.style['left'] = -DIAGONAL+'px';
	this.html.front_axis.style['bottom'] = WHEELBASE*SIZE_RATIO+'px';
	
	this.addCar();
	this.updateTrailVisibility();
	this.updateCameraPosition();
	
	document.addEventListener("keydown", this.keydownHandler, false);
	document.addEventListener("keyup", this.keyupHandler, false);
}

var the_canvas = new Canvas({
	parking_lot: document.getElementById("parkSim"),
	speedometer: document.getElementById("velocity"),
	show_trail_checkbox: document.getElementById("show-trail"),
	fix_camera_checkbox: document.getElementById("fix-camera"),
	add_car_button: document.getElementById("add-car"),
	remove_car_button: document.getElementById("remove-car")
});
