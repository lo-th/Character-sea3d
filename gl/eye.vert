varying vec3 oPosition;  // position in world space
varying vec3 oNormal;    // normal in world space
varying vec3 oView;      // view vector in world space

varying vec3 mPosition;  // position in model space
varying vec3 mNormal;    // normal in model space
varying vec3 mView;      // view vector in model space

varying vec3 vPosition;	 // position in view space
varying vec3 vNormal;    // normal in view space

uniform float iris_size;		
uniform float cornea_bump_amount;
uniform float cornea_bump_radius_mult;

mat4 InverseMatrix( mat4 A ) {

	float s0 = A[0][0] * A[1][1] - A[1][0] * A[0][1];
	float s1 = A[0][0] * A[1][2] - A[1][0] * A[0][2];
	float s2 = A[0][0] * A[1][3] - A[1][0] * A[0][3];
	float s3 = A[0][1] * A[1][2] - A[1][1] * A[0][2];
	float s4 = A[0][1] * A[1][3] - A[1][1] * A[0][3];
	float s5 = A[0][2] * A[1][3] - A[1][2] * A[0][3];
 
	float c5 = A[2][2] * A[3][3] - A[3][2] * A[2][3];
	float c4 = A[2][1] * A[3][3] - A[3][1] * A[2][3];
	float c3 = A[2][1] * A[3][2] - A[3][1] * A[2][2];
	float c2 = A[2][0] * A[3][3] - A[3][0] * A[2][3];
	float c1 = A[2][0] * A[3][2] - A[3][0] * A[2][2];
	float c0 = A[2][0] * A[3][1] - A[3][0] * A[2][1];
 
	float invdet = 1.0 / (s0 * c5 - s1 * c4 + s2 * c3 + s3 * c2 - s4 * c1 + s5 * c0);
 
	mat4 B;
 
	B[0][0] = ( A[1][1] * c5 - A[1][2] * c4 + A[1][3] * c3) * invdet;
	B[0][1] = (-A[0][1] * c5 + A[0][2] * c4 - A[0][3] * c3) * invdet;
	B[0][2] = ( A[3][1] * s5 - A[3][2] * s4 + A[3][3] * s3) * invdet;
	B[0][3] = (-A[2][1] * s5 + A[2][2] * s4 - A[2][3] * s3) * invdet;
 
	B[1][0] = (-A[1][0] * c5 + A[1][2] * c2 - A[1][3] * c1) * invdet;
	B[1][1] = ( A[0][0] * c5 - A[0][2] * c2 + A[0][3] * c1) * invdet;
	B[1][2] = (-A[3][0] * s5 + A[3][2] * s2 - A[3][3] * s1) * invdet;
	B[1][3] = ( A[2][0] * s5 - A[2][2] * s2 + A[2][3] * s1) * invdet;
 
	B[2][0] = ( A[1][0] * c4 - A[1][1] * c2 + A[1][3] * c0) * invdet;
	B[2][1] = (-A[0][0] * c4 + A[0][1] * c2 - A[0][3] * c0) * invdet;
	B[2][2] = ( A[3][0] * s4 - A[3][1] * s2 + A[3][3] * s0) * invdet;
	B[2][3] = (-A[2][0] * s4 + A[2][1] * s2 - A[2][3] * s0) * invdet;
 
	B[3][0] = (-A[1][0] * c3 + A[1][1] * c1 - A[1][2] * c0) * invdet;
	B[3][1] = ( A[0][0] * c3 - A[0][1] * c1 + A[0][2] * c0) * invdet;
	B[3][2] = (-A[3][0] * s3 + A[3][1] * s1 - A[3][2] * s0) * invdet;
	B[3][3] = ( A[2][0] * s3 - A[2][1] * s1 + A[2][2] * s0) * invdet;
 
	return B;
}

mat3 makeRotationDir( vec3 direction, vec3 up )
{
	 vec3 xaxis = normalize( cross( up, direction));
	 vec3 yaxis = normalize( cross( direction, xaxis));

	return mat3( xaxis.x,         xaxis.y,     xaxis.z,
				 yaxis.x,         yaxis.y,     yaxis.z,
				 direction.x, direction.y, direction.z);
}

mat3 rotationMatrix(vec3 axis, float angle)
{
	axis = normalize(axis);
	float s = sin(angle);
	float c = cos(angle);
	float oc = 1.0 - c;
	
	return mat3(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
				oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
				oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c);
}

vec3 corneaVertexDisp
(
	vec3		eyeP,
	vec3		eyeN,
	float		iris_size,
	float		cornea_bump_amount,
	float		cornea_bump_radius_mult,
	out vec3	outN
)
{
	vec3 _norm_P = normalize( eyeP );
	float iris_depth = 1.0 - pow(  iris_size, 3.0 );
	float _measured_eye_radius = length( eyeP );
	float _iris_rad = sqrt( max( 0.0, 1.0 - iris_depth * iris_depth ) );
	float _bump_t = 1.0;
	if( _norm_P[2] > 0.0 )
	{
		_bump_t = min( 1.0, sqrt( max( 0.0, 1.0 - _norm_P[2] * _norm_P[2] ) ) / (
				_iris_rad * cornea_bump_radius_mult ) );
	}
	float _bump_factor = pow( 1.0 - pow( _bump_t, 2.5 ), 1.0 ); 
	_bump_factor *= cornea_bump_amount * _iris_rad * _measured_eye_radius;
	
	// faking bulging cornea normals yolo
	float NzMask = 1.0 - (_bump_factor * (1.0-eyeN.z) * 2.5);				
	outN =  normalize( vec3( eyeN.xy, eyeN.z * NzMask));
	
	return _bump_factor * eyeN;
}

void main() {

	vec3 displacedN;
	vec3 displacedP = position.xyz + corneaVertexDisp( position.xyz, normal, iris_size, cornea_bump_amount, cornea_bump_radius_mult, displacedN );		
				
	oPosition	= vec3( modelMatrix * vec4( displacedP, 1.0 ));
	oNormal		= normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * displacedN );
	oView		= normalize( oPosition - cameraPosition );

	mPosition	= displacedP;
	mNormal 	= displacedN;
	 
	// we need to get cameraPosition in object space but three.js gives it in world space ( camera.matrixWorld )
	// its possible to get it from gl_ModelViewMatrixInverse[3].xyz matrix but can't access it from three.js
	// an option is to calculate and pass it from three.js using THREE.Matrix4()
	// .getInverse( .multiplyMatrices( camera.matrixWorldInverse, mesh.matrixWorld ) )
	// or since Three.js provides us with modelViewMatrix we can inverse it using expensive InverseMatrix() function
	mat4 myModelViewMatrixInverse = InverseMatrix( modelViewMatrix );
	mView = normalize( mPosition - myModelViewMatrixInverse[3].xyz );
	
			// EXPERIMENTS with rotations
			/*
			vec3 lookat = normalize( vec3( 0.5, 0.0, 6.0) );
			mPosition	= makeRotationDir( lookat, vec3( 0.0, 1.0, 0.0) ) * mPosition;
			mNormal		= makeRotationDir( lookat, vec3( 0.0, 1.0, 0.0) ) * mNormal; mNormal = normalize( mNormal );
			mView		= makeRotationDir( lookat, vec3( 0.0, 1.0, 0.0) ) * mView; mView = normalize( mView );

			
			vec3 axis	= vec3( 1.0, 0.0, 0.0);
			float angle	= radians(-90.0);
			mPosition	= rotationMatrix( axis, angle) * mPosition;
			mNormal		= rotationMatrix( axis, angle) * mNormal; mNormal = normalize( mNormal );
			mView		= rotationMatrix( axis, angle) * mView; mView = normalize( mView );			
			*/
			
	vPosition	= vec3( modelViewMatrix * vec4( displacedP, 1.0 ));
	vNormal		= normalize( normalMatrix * displacedN );
	
	gl_Position = projectionMatrix * modelViewMatrix * vec4( displacedP, 1.0 );
	
}