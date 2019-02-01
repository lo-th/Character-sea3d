function Eyes ( option ) {

	THREE.Object3D.call( this );

	this.imgLoader = new THREE.TextureLoader();

	this.inner = new THREE.Group();
	this.add( this.inner );

	var torad = THREE.Math.DEG2RAD;
	this.inner.rotation.set( 180*torad, 0*torad, 90*torad );
	this.inner.position.set( -9.44 ,0, -4.85);

	this.option = option || {
		pos:[2.64,0,0],
		radius: 1.4, 
	};

	this.target = new THREE.Group();
	this.inner.add( this.target );

	this.looker = new THREE.Vector3(1,0,0);

	this.bone = null;
	//this.mtx = new THREE.Matrix4();
	//this.reference_skeleton = null;
	

	this.isReady = false;
	
	this.load("./gl/eye");
	
}

Eyes.prototype = Object.assign( Object.create( THREE.Object3D.prototype ),{

	setBone: function ( name, skeleton ) {

		this.bone = skeleton.getBoneByName( name )//.bones[ bone.userData.idr ];
		this.matrix = this.bone.matrixWorld;//this.bone.userData.phyMtx;
		this.matrixAutoUpdate = false;

	},

	ragdoll: function ( b ) {

		if(b)this.matrix = this.bone.userData.phyMtx;
		else this.matrix = this.bone.matrixWorld;
	},

	look: function ( v ) {

		if(!this.isReady) return;

		this.target.position.set((v.x*40), (v.y*30), 100);

		var m = new THREE.Matrix4();

        m.lookAt( this.target.position.clone().add(new THREE.Vector3(0,-2,0)), this.eye_L.position, this.eye_L.up );
        this.eye_L.quaternion.setFromRotationMatrix( m );

        m.lookAt( this.target.position.clone().add(new THREE.Vector3(0,2,0)), this.eye_R.position, this.eye_R.up );
        this.eye_R.quaternion.setFromRotationMatrix( m );

	},

	load: function ( url ) {

		this.shader = {
			uniforms:{
				texEyeCol: { value: null },
				texEyeNrm: { value: null },
				texEnvRfl: { value: null },
				texEnvDif: { value: null },
				texEnvRfr: { value: null },

				lightPosition: { value: light.position.clone().normalize() },
				
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

	setEnvmap: function (name) {

		var textureEnv = this.imgLoader.load( './assets/textures/envmap/'+name+'.jpg' );
		textureEnv.wrapS = THREE.RepeatWrapping;
		textureEnv.offset.x = -0.25;

		if(this.material){
			this.material.uniforms.texEnvRfl.value = textureEnv;
			this.material.uniforms.texEnvDif.value = textureEnv;
		}

	},

	makeMaterial: function (){

		var textureColor = this.imgLoader.load( './assets/textures/eye/eye_c.jpg' );
		var textureNormal = this.imgLoader.load( './assets/textures/eye/eye_n.jpg' );
		var textureEnv = this.imgLoader.load( './assets/textures/envmap/'+envName+'.jpg' );
		textureEnv.wrapS = THREE.RepeatWrapping;
		textureEnv.offset.x = -0.25;
		//var textureEnv2 = loader.load( './assets/textures/studio_low.jpg' );
		var textureRfc = this.imgLoader.load( './assets/textures/eye/rfc.png' );

		textureColor.minFilter = textureColor.magFilter = THREE.LinearFilter;
		textureNormal.minFilter = textureNormal.magFilter = THREE.LinearFilter;
		textureColor.wrapS = textureNormal.wrapS = THREE.RepeatWrapping;


	    this.material = new THREE.ShaderMaterial( this.shader );
		this.material.extensions.derivatives = true;
		this.material.uniforms.texEyeCol.value = textureColor;
		this.material.uniforms.texEyeNrm.value = textureNormal;
		this.material.uniforms.texEnvRfl.value = textureEnv;
		this.material.uniforms.texEnvDif.value = textureEnv;//textureEnv2;
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

		this.isReady = true;

	},

	/*updateMatrixWorld: function (force) {

		//var mtx = new THREE.Matrix4();

		//return function updateMatrixWorld( force ) {


			if( this.bone ){
				this.matrix = ( this.bone.userData.isPhysics ? this.bone.userData.phyMtx : this.bone.matrixWorld );
			}
            

			THREE.Object3D.prototype.updateMatrixWorld.call( this, force );
	//	}

		

	}//()*/


});

