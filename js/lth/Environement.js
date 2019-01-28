/**   _  _____ _   _   
*    | ||_   _| |_| |
*    | |_ | | |  _  |
*    |___||_| |_| |_|
*    @author lo.th / https://github.com/lo-th
*
*    Description: Environement HDR from .hdr or .jpg
*
*/

function Environement ( renderer, scene, resolution ) {

	this.renderer = renderer;
	this.scene = scene;

	this.resolution = resolution || 1024;
	this.isHdr = false;

	this.envmap = new THREE.Texture();
	this.skyScene = null;
    this.skyCamera = null;

    this.data = [
        0.4, 0.4, 0.75, 0.5, 
        0.6, 0.6, 0.75, 0.5,
    ];

    // display in three background 
    this.background = true;

    this.init();

}

Environement.prototype = {

	init: function () {

        this.skyScene = new THREE.Scene();
        this.renderMaterial = new THREE.ShaderMaterial( skyMat );
        this.ball = new THREE.Mesh( new THREE.SphereGeometry( 1, 64, 64 ), this.renderMaterial );
        this.skyCamera = new THREE.CubeCamera( 0.1, 1, this.resolution, { type:THREE.UnsignedByteType, encoding:THREE.RGBEEncoding , format: THREE.RGBAFormat, magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter, generateMipmaps:false, anisotropy:0 } );
        this.skyScene.add( this.ball );

	},

    parse: function ( buffer, callback, type ) {

        this.callback = callback || new function(){};

        var loader, texture, o;

        if( type === 'hdr' ){

            this.isHdr = true;

            loader = new THREE.RGBELoader();
            o = loader._parser( buffer );

            texture = new THREE.DataTexture( o.data, o.width, o.height, o.format, o.type, 300, 1001, 1001, THREE.NearestFilter, THREE.NearestFilter, 1, THREE.RGBEEncoding )
            texture.encoding = THREE.RGBEEncoding;
            texture.needsUpdate = true;
            this.update( texture );

        }

        if( type === 'jpg' ){

            this.isHdr = false;

            var img = new Image();
            img.src = buffer;

            img.onload = function (){

                var texture = new THREE.Texture( img );
                texture.needsUpdate = true;
                this.update( texture )

            }.bind(this)
            
        }

    },

	load: function ( url, callback ) {

		this.callback = callback || function(){};

        var loader;
        var type = url.substring( url.lastIndexOf('.')+1 );

        if( type === 'jpg' || type === 'png' ){
        	this.isHdr = false;
            loader = new THREE.TextureLoader();
        }

        if( type === 'hdr' ){
        	this.isHdr = true;
            loader = new THREE.RGBELoader();
        }

        var self = this;
 
        loader.load( url, function ( texture ){ 

            if( self.isHdr ){

            	texture.type = THREE.UnsignedByteType;
            	texture.encoding = THREE.RGBEEncoding;
            	texture.format = THREE.RGBAFormat;
                texture.minFilter = THREE.NearestFilter;
                texture.magFilter = THREE.NearestFilter;
                texture.generateMipmaps = false;
                texture.anisotropy = 0;

            }

            self.update( texture ); 

        });

	},

	update: function ( texture ) {

        this.envmap.dispose();

        if( texture !== undefined ){ 
            texture.wrapS = THREE.RepeatWrapping;
            //texture.offset.x = 0.5;
            //texture.needsUpdate = true;
            this.renderMaterial.uniforms.map.value = texture;
            this.renderMaterial.uniforms.offset.value = -0.25;
        }
        this.renderMaterial.uniforms.isHdr.value = this.isHdr ? 1 : 0;
        this.renderMaterial.uniforms.data.value = this.data;

        this.skyCamera.update( this.renderer, this.skyScene );

        var pmremGenerator = new THREE.PMREMGenerator( this.skyCamera.renderTarget.texture, 32, 256 );
        pmremGenerator.update( this.renderer );

        var pmremCubeUVPacker = new THREE.PMREMCubeUVPacker( pmremGenerator.cubeLods );
        pmremCubeUVPacker.update( this.renderer );

        var hdrCubeRenderTarget = pmremCubeUVPacker.CubeUVRenderTarget;

        pmremGenerator.dispose();
        pmremCubeUVPacker.dispose();

        this.envmap = hdrCubeRenderTarget.texture;

        this.showBackground( this.background );

        this.callback();


    },

    showBackground: function ( b ) {

        this.background = b;
        this.scene.background = this.background ? this.skyCamera.renderTarget : null;

    },

}


var skyMat = {
    uniforms:{
        map: { value: null },
        offset: { value: 0 },
        decode: { value: 0 },
        isHdr: { value: 1 },
        rev: { value: 0 },
        data: { value:[] },
    },
    vertexShader: [
    'varying vec2 vUv;',
    'void main() {',
        'vUv = uv;',
        'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}'
    ].join("\n"),
    fragmentShader: [

    '#include <common>',

    'uniform float data[12];',

    'vec4 Filters( in vec4 c, float B, float C, float V, float S ) {',

        'B = (B*2.0)-1.0;',
        'C = (C*2.0)-1.0;',
        'V = (V*2.0)-1.0;',
        'S = (S*2.0)-1.0;',

        
        // B : brightness: { value: 0 },// -1 to 1 (-1 is solid black, 0 is no change, and 1 is solid white)
        // C : contrast: { value: 0 },// -1 to 1 (-1 is solid gray, 0 is no change, and 1 is maximum contrast)
        // V : vibrance -1 to 1 (-1 is minimum vibrance, 0 is no change, and 1 is maximum vibrance)
        // S : saturation:  -1 to 1 (-1 is solid gray, 0 is no change, and 1 is maximum contrast)

        // Brigness / Contrast
        'c.rgb += B;',
        'if (C > 0.0) {',
            'c.rgb = (c.rgb - 0.5) / (1.0 - C) + 0.5;',
        '} else {',
            'c.rgb = (c.rgb - 0.5) * (1.0 + C) + 0.5;',
        '}',

        // Vibrance
        'float average = ( c.r + c.g + c.b ) / 3.0;',
        'float mx = max(c.r, max(c.g, c.b));',
        'float amt = (mx - average) * (-V * 3.0);',
        'c.rgb = mix(c.rgb, vec3(mx), amt);',

        // Saturation
        'average = ( c.r + c.g + c.b ) / 3.0;',
        'if (S > 0.0) {',
            'c.rgb += (average - c.rgb) * (1.0 - 1.0 / (1.001 - S));',
        '} else {',
            'c.rgb += (average - c.rgb) * (-S);',
        '}',

        'return c;',

    '}',

    'vec4 ToRGBE( in vec4 value ) {',
		'float maxComponent = max( max( value.r, value.g ), value.b );',
		'float fExp = clamp( ceil( log2( maxComponent ) ), -128.0, 127.0 );',
		'return vec4( value.rgb / exp2( fExp ), ( fExp + 128.0 ) / 255.0 );',
	    //'return vec4( value.brg, ( 3.0 + 128.0 ) / 256.0 );',
	'}',

    'vec4 toHDR( in vec4 c ) {',
        //'c.a = 1.0;',
        'return ToRGBE( c );',

    '}',

    'vec4 toHDRX( in vec4 c ) {',
        'vec3 v = c.rgb;',
        //'v = pow( abs(v), vec3(2.2) );',
        //'v = pow( abs(v), vec3(2.2) );',
        //'v = v * 10.0;', 
        'v = pow( abs(v), vec3(1.6));',// exposure and gamma increase to match HDR
        'return ToRGBE( vec4(v.r, v.g, v.b, 1.0) );',
    '}',

    'vec4 HdrEncode(vec3 value) {',
		//'value = value / 65536.0;',
		'vec3 exponent = clamp(ceil(log2(value)), -128.0, 127.0);',
		'float commonExponent = max(max(exponent.r, exponent.g), exponent.b);',
		'float range = exp2(commonExponent);',
		'vec3 mantissa = clamp(value / range, 0.0, 1.0);',
		'return vec4(mantissa, (commonExponent + 128.0)/256.0);',
	'}',

    'uniform sampler2D map;',
    'uniform int decode;',
    'uniform int isHdr;',
    'uniform int rev;',
    'uniform float offset;',
    'varying vec2 vUv;',

    
    'void main() {',

        'int flip = isHdr;',
        'vec2 uVx = vec2( rev == 1 ? 0.5 - vUv.x : vUv.x, flip == 1 ? 1.0 - vUv.y : vUv.y );',
        'uVx.x += offset;',
        'vec4 c = texture2D( map, uVx );',
        //'vec4 color = isHdr == 1 ? c : toHDR( Filters( c, data[0], data[1], data[2], data[3] ) * Filters( c, data[4], data[5], data[6], data[7] ) );',
        'vec4 color = isHdr == 1 ? c : toHDRX( c );',
        'gl_FragColor = decode == 1 ? RGBEToLinear( color ) : color;',
     
    '}'
    ].join("\n"),
    depthWrite: false,
    side: THREE.BackSide
};