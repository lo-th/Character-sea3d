/**
 * @author sroucheray / http://sroucheray.org/
 * @author mrdoob / http://mrdoob.com/
 */


function Axes( size ) {

	size = size || 1;

	var vertices = [
		0, 0, 0,	size, 0, 0,
		0, 0, 0,	0, size, 0,
		0, 0, 0,	0, 0, size
	];

	var colors = [
		1, 0, 0,	1, 0, 0,
		0, 1, 0,	0, 1, 0,
		0, 0, 1,	0, 0, 1
	];

	var geometry = new THREE.BufferGeometry();
	geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
	geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );

	var material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );

	THREE.LineSegments.call( this, geometry, material );

}

Axes.prototype = Object.create( THREE.LineSegments.prototype );
Axes.prototype.constructor = Axes;
