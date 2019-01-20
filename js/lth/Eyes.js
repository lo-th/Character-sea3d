function Eyes ( option ) {

	THREE.Object3D.call( this );

	this.inner = new THREE.Object3D();
	this.add(this.inner);

	var torad = THREE.Math.DEG2RAD;
	this.inner.rotation.set( 180*torad, 0*torad, 90*torad );

	this.option = option || {
		pos:[2.64,9.44,4.85],
		radius: 1.4, 
	};
	
	this.load("./gl/eye");
	
}

Eyes.prototype = Object.assign( Object.create( THREE.Object3D.prototype ),{

	load: function ( url ) {

		this.shader = {
			uniforms:{
				texEyeCol: { value: null },
				texEyeNrm: { value: null },
				texEnvRfl: { value: null },
				texEnvDif: { value: null },
				texEnvRfr: { value: null },
				
				pupil_size:				{ value: 0.2 },	  // pupil resting size
				iris_tex_start:			{ value: 0.009 }, // V coordinate in texture where the iris color begins
				iris_tex_end:			{ value: 0.13 },  // V coordinate in texture where the iris color ends
				iris_border:			{ value: 0.001 }, // Insets the iris from the cornea
				iris_size:				{ value: 0.52 },  // Iris plane distance from origin
				iris_edge_fade:			{ value: 0.04 },  // Distance that sclera fades out onto cornea
				iris_inset_depth:		{ value: 0.03 },  // Distance that sclera shifts out onto cornea
				sclera_tex_scale:		{ value: -0.14 }, // Controls V scale of sclera texture
				sclera_tex_offset:		{ value: 0.04 },  // Offsets sclera texture in V (leave at 0 to match iris)
				ior:					{ value: 1.3 },	  // cornea index of refraction
				refract_edge_softness:	{ value: 0.1 },	  // How far to fade out the back edge of the eye

				iris_texture_curvature:	{ value: 0.51 },	 // How much the iris bows inward for computing the pupil pos
				arg_iris_shading_curvature: { value: 0.51 }, // How much the iris bows inward for computing normals and shadows

				tex_U_offset:			{ value: 0.25 },  // Rotate the texture around the eye
				cornea_bump_amount:		{ value: 0.1 },	  // Adjust cornea normals to fake the cornea bulging out this much
				cornea_bump_radius_mult:{ value: 0.9 },	  // Multiply the radius of the cornea bump beyond the iris
				iris_normal_offset:		{ value: 0.001 }, // Offset the edge of the cornea for the cornea bump
				cornea_density:			{ value: 0.001 }, // Add fog to the cornea
				bump_texture:			{ value: 0.3 },	  // Bump Texture value
				catshape:				{ value: false }, // Cat eye shape
				cybshape:				{ value: false }, // Cyborg refractions
				col_texture:			{ value: true  }, // Enable color texture
			}
		};

		var loader = new THREE.FileLoader( THREE.DefaultLoadingManager );

		loader.load( url + ".vert", function ( text ) { 

			this.shader.vertexShader = text; 

			loader.load( url + ".frag", function ( text ) { 

				this.shader.fragmentShader = text; 
				this.makeMaterial();

			}.bind(this) );
		}.bind(this) );

	},

	makeMaterial: function (){

		var loader = new THREE.TextureLoader();

		var textureColor = loader.load( './assets/textures/eye/eye_c.jpg' );
		var textureNormal = loader.load( './assets/textures/eye/eye_n.jpg' );
		var textureEnv = loader.load( './assets/textures/eye/env.jpg' );
		var textureEnv2 = loader.load( './assets/textures/eye/env2.jpg' );
		var textureRfc = loader.load( './assets/textures/eye/rfc.png' );

		textureColor.minFilter = textureColor.magFilter = THREE.LinearFilter;
		textureNormal.minFilter = textureNormal.magFilter = THREE.LinearFilter;
		textureColor.wrapS = textureNormal.wrapS = THREE.RepeatWrapping;


	    this.material = new THREE.ShaderMaterial( this.shader );
		this.material.extensions.derivatives = true;
		this.material.uniforms.texEyeCol.value = textureColor;
		this.material.uniforms.texEyeNrm.value = textureNormal;
		this.material.uniforms.texEnvRfl.value = textureEnv;
		this.material.uniforms.texEnvDif.value = textureEnv2;
		this.material.uniforms.texEnvRfr.value = textureRfc;

		this.makeMesh();
		

	},

	makeMesh: function () {

		this.geometry = new THREE.SphereBufferGeometry( this.option.radius, 30, 26 );

		this.eye_L = new THREE.Mesh( this.geometry, this.material );
		this.eye_R = new THREE.Mesh( this.geometry, this.material );

		this.eye_L.position.fromArray( this.option.pos );
		this.eye_R.position.fromArray( this.option.pos );
		this.eye_L.position.x *= -1;

		this.inner.add( this.eye_L );
		this.inner.add( this.eye_R );

	},


});

