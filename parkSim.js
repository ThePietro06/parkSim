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

var updateWorker = new Worker("update.js");

Math.square = function(a) {
	return a * a;
};

function Canvas(car_wrapper) {
	this.car_wrapper = car_wrapper;

	this.car = {
		pos_x: 0,
		pos_y: 0,
		pos_rot: 0,
		axis_rot: 0,
		axis_rot: 0,
		turn_radius: 0,
		show_trail: true,
		fixed_camera: true,
		html: {
			wrapper: document.createElement('div'),
			background: document.createElement('img'),
			trail: document.createElement('div'),
			back_axis: document.createElement('div'),
			front_axis: document.createElement('div'),
			body: document.createElement('div')
		},
		updatePos: function() {
			if(this.fixed_camera) {
				this.html.wrapper.style['bottom'] = SIZE_RATIO*this.pos_y+'px';
				this.html.wrapper.style['left'] = SIZE_RATIO*this.pos_x+'px';
				this.html.wrapper.style['transform'] = 'rotate('+this.pos_rot+'rad)';
			}
			else {
				this.html.background.style['bottom'] = (CAR_POS_Y_FIXED_CAMERA - SIZE_RATIO*this.pos_y) + 'px';
				this.html.background.style['left'] = (CAR_POS_X_FIXED_CAMERA - SIZE_RATIO*this.pos_x) + 'px';
				this.html.background.style['transform-origin'] = (SIZE_RATIO*this.pos_x) + 'px ' + (HEIGHT - SIZE_RATIO*this.pos_y) + 'px';
				this.html.background.style['transform'] = 'rotate('+(-this.pos_rot)+'rad)';
			}
			this.html.front_axis.style['transform'] = 'rotate('+this.axis_rot+'rad)';
			
			var axis_rot_abs = Math.abs(this.axis_rot);
			if(this.show_trail && axis_rot_abs > MIN_TRAILED_TURN_ANGLE) {
				var radius_abs = Math.abs(this.turn_radius); // [cm]
				var trail_inner_bound = radius_abs + CAR_BODY_OFFSET_LEFT; /* [cm] */
				var trail_outer_bound = Math.sqrt(Math.square(radius_abs - CAR_BODY_OFFSET_LEFT) + Math.square(CAR_BODY_OFFSET_TOP * 0.85)); /* [cm] */
				var trail_width = trail_outer_bound - trail_inner_bound; /* [cm] */
				this.html.trail.style['width'] = trail_outer_bound * SIZE_RATIO * 2 + 'px';
				this.html.trail.style['height'] = trail_outer_bound * SIZE_RATIO * 2 + 'px';
				this.html.trail.style['border-width'] = trail_width * SIZE_RATIO + 'px';
				if(this.turn_radius > 0) {
					this.html.trail.style['left'] = (- trail_width - CAR_BODY_OFFSET_LEFT) * SIZE_RATIO + 'px';
					this.html.trail.style['right'] = 'auto';
				}
				else {
					this.html.trail.style['left'] = 'auto';
					this.html.trail.style['right'] = (- trail_width - CAR_BODY_OFFSET_LEFT) * SIZE_RATIO + 'px';
				}
				this.html.trail.style['top'] = - trail_outer_bound * SIZE_RATIO + 'px';
				this.html.trail.style['opacity'] = (axis_rot_abs - MIN_TRAILED_TURN_ANGLE) / MAX_TURN_ANGLE * 0.1;
				this.html.trail.style['display'] = 'block';
			}
			else {
				this.html.trail.style['display'] = 'none';
			}
		}
	};
	
	this.car_wrapper.style['background-color'] = '#b3b3b3';
	this.car_wrapper.appendChild(this.car.html.background);
	this.car.html.background.src = 'img/parking-lot.svg';
	this.car.html.background.style['position'] = 'absolute';
	this.car.html.background.style['width'] = '100%';
	this.car.html.background.style['height'] = '100%';
	this.car.html.background.style['bottom'] = '0px';
	this.car.html.background.style['left'] = '0px';
	this.car_wrapper.appendChild(this.car.html.wrapper);
	this.car.html.wrapper.appendChild(this.car.html.trail);
	this.car.html.wrapper.appendChild(this.car.html.back_axis);
	this.car.html.wrapper.appendChild(this.car.html.front_axis);
	this.car.html.wrapper.appendChild(this.car.html.body);
	this.car.html.wrapper.style['position'] = 'absolute';
	this.car.html.wrapper.style['width'] = '0px';
	this.car.html.wrapper.style['height'] = '0px';
	this.car.html.wrapper.style['bottom'] = '0px';
	this.car.html.wrapper.style['left'] = '0px';
	this.car.html.trail.style['display'] = 'none';
	this.car.html.trail.style['position'] = 'absolute';
	this.car.html.trail.style['border-radius'] = '100%';
	this.car.html.trail.style['border-color'] = '#f00';
	this.car.html.trail.style['border-style'] = 'solid';
	this.car.html.trail.style['box-sizing'] = 'border-box';
	this.car.html.back_axis.style['position'] = 'relative';
	this.car.html.back_axis.style['width'] = DIAGONAL*2+'px';
	this.car.html.back_axis.style['height'] = '0px';
	this.car.html.back_axis.style['border-top'] = '2px dashed rgba(255, 0, 0, 0.3)';
	this.car.html.back_axis.style['left'] = -DIAGONAL+'px';
	this.car.html.back_axis.style['top'] = '0px';
	this.car.html.front_axis.style['position'] = 'absolute';
	this.car.html.front_axis.style['width'] = DIAGONAL*2+'px';
	this.car.html.front_axis.style['height'] = '0px';
	this.car.html.front_axis.style['border-top'] = '2px dashed rgba(255, 0, 0, 0.3)';
	this.car.html.front_axis.style['left'] = -DIAGONAL+'px';
	this.car.html.front_axis.style['bottom'] = WHEELBASE*SIZE_RATIO+'px';
	this.car.html.body.style['position'] = 'absolute';
	this.car.html.body.style['width'] = SIZE_RATIO*CAR_WIDTH+'px';
	this.car.html.body.style['height'] = SIZE_RATIO*CAR_LENGTH+'px';
	this.car.html.body.style['left'] = SIZE_RATIO*CAR_BODY_OFFSET_LEFT+'px';
	this.car.html.body.style['top'] = SIZE_RATIO*CAR_BODY_OFFSET_TOP+'px';
	this.car.html.body.style['background-size'] = '100% 100%';
	this.car.html.body.style['background-repeat'] = 'no-repeat';
	this.car.html.body.style['background-image'] = 'url("img/corsa.svg")';
}

var the_canvas = new Canvas(document.getElementById('parkSimCar'));

var keydownHandler = function(e) {
	updateWorker.postMessage({pressing: 1, key: e.key});
};

var keyupHandler = function(e) {
	updateWorker.postMessage({pressing: 0, key: e.key});
};

var recieveHandler = function(e) {
	the_canvas.car.pos_x = e.data.pos_x;
	the_canvas.car.pos_y = e.data.pos_y;
	the_canvas.car.pos_rot = e.data.pos_rot;
	the_canvas.car.axis_rot = e.data.axis_rot;
	the_canvas.car.turn_radius = e.data.turn_radius;
};

var updateTrailVisibility = function(e) {
	the_canvas.car.show_trail = document.getElementById("show-trail").checked;
}

var updateCameraPosition = function(e) {
	the_canvas.car.fixed_camera = document.getElementById("fix-camera").checked;
	if(the_canvas.car.fixed_camera) {
		the_canvas.car.html.background.style['left'] = '0px';
		the_canvas.car.html.background.style['bottom'] = '0px';
		the_canvas.car.html.background.style['transform'] = 'none';
	}
	else {
		the_canvas.car.html.wrapper.style['left'] = CAR_POS_X_FIXED_CAMERA+'px';
		the_canvas.car.html.wrapper.style['bottom'] = CAR_POS_Y_FIXED_CAMERA+'px';
		the_canvas.car.html.wrapper.style['transform'] = 'none';
	}
}

document.addEventListener("keydown", keydownHandler, false);
document.addEventListener("keyup", keyupHandler, false);
updateWorker.addEventListener("message", recieveHandler, false);
document.getElementById("show-trail").addEventListener("change", updateTrailVisibility, false);
document.getElementById("fix-camera").addEventListener("change", updateCameraPosition, false);

var run = function() {
	the_canvas.car.updatePos();
	window.requestAnimationFrame(run);
};

(function() {
	updateTrailVisibility();
	updateCameraPosition();
	run();
})();
