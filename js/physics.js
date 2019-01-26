/**   _  _____ _   _   
*    | ||_   _| |_| |
*    | |_ | | |  _  |
*    |___||_| |_| |_|
*    @author lo.th / http://lo-th.github.io/labs/
*    AMMO worker launcher
*/


// transphere array for AMMO worker
var Ar;

var physics = ( function () {

    'use strict';

    var URL = window.URL || window.webkitURL;

    var contacts = [];
    var contactCallback = [];

    var ArLng = [ 
        1000 * 8, // 0_rigid
        //100 * 4, // 1_joint
        //8192 * 3,  // 2_soft
        //10 * 8, // hero
        //14 * 56, // cars
    ];

    var ArPos = [ 
        0, 
        //ArLng[0], 
        //ArLng[0] + ArLng[1],
        //ArLng[0] + ArLng[1] + ArLng[2],
        //ArLng[0] + ArLng[1] + ArLng[2] + ArLng[3],
    ];

    var ArMax = ArLng[0];// + ArLng[1] + ArLng[2] + ArLng[3] + ArLng[4];

    var worker, callback;
    var blob = null;
    var isBuffer = false;
    var isPause = false;

    //var timestep = 1/60;
    var timerate = (1/60) * 1000;
    //var substep = 2;//7;
    var time = 0;
    var then = 0;
    var delta = 0;
    var temp = 0;
    var count = 0;
    var fps = 0;

    var stepNext = false;
    var timer = undefined;


    var meshData = [];

    


    physics = {

        isReady: false,
        isStart: false,

        load: function ( Callback, Option ) {

            console.log('load')

            var xhr = new XMLHttpRequest(); 
            xhr.responseType = "arraybuffer";
            xhr.open('GET', "./worker/ammo.hex", true);

            xhr.onreadystatechange = function () {

                if ( xhr.readyState === 2 ) {
                } else if ( xhr.readyState === 3 ) { //  progress
                } else if ( xhr.readyState === 4 ) {
                    if ( xhr.status === 200 || xhr.status === 0 ){ 
                        blob = new Blob([ SEA3D.File.LZMAUncompress( xhr.response ) ], { type: 'application/javascript' });
                        physics.init( Callback, Option );
                    } else console.error( "Couldn't load ["+ name + "] [" + xhr.status + "]" );
                }

            }

            xhr.send( null );

        },

        init: function ( Callback, Option ) {

            if( worker ){ console.log( 'worker already add' ); return; }

            if( blob === null ){
                physics.load( Callback, Option );
                return;
            }

            callback = Callback || function (){};

            Option = Option || {};

            var option = {

                worldscale: Option.worldscale || 1,
                gravity: Option.gravity || [0,-10,0],
                fps: Option.fps || 60,

                substep: Option.substep || 2,
                broadphase: Option.broadphase || 2,
                soft: Option.soft || false,

                //penetration: Option.penetration || 0.0399,


            };

            timerate = (1/option.fps) * 1000;

            worker = new Worker('./worker/ammo.worker.js');
            worker.onmessage = this.message;
            worker.postMessage = worker.webkitPostMessage || worker.postMessage;

            //blob = document.location.href.replace(/\/[^/]*$/,"/") + "./worker/ammo.js";

            // test transferrables
            if( Option.noBuffer ) isBuffer = false;
            else {
                var ab = new ArrayBuffer(1);
                worker.postMessage( ab, [ab] );
                isBuffer = ab.byteLength ? false : true;
            }
            

            // start physics worker
            worker.postMessage( { m:'init', blob:URL.createObjectURL( blob ), settings:[ ArLng, ArPos, ArMax ], isBuffer:isBuffer, option:option });
            
        },

        message: function( e ) {

            var data = e.data;
            if( data.Ar ) Ar = data.Ar;
            if( data.contacts ) contacts = data.contacts;

            switch( data.m ){

                case 'initEngine': physics.initEngine(); break;
                case 'start': physics.start( data ); break;
                case 'step':physics.step(); break;
                //case 'ellipsoid': view.ellipsoidMesh( data.o ); break;
                //case 'terrain': view.completeTerrain( data.o.name ); break;

                case 'destroy':physics.destroy(); break;

            }

        },

        updateContact: function () {

            contactCallback.forEach( function ( callb, id ) {

                callb( contacts[id] || 0 );

            });

        },

        initEngine: function () {

            //URL.revokeObjectURL( blob );
            //blob = null;

            console.log( "AMMO worker init "+(isBuffer? "with":"without")+" Buffer" );

            physics.isReady = true;

            if( callback ) callback();

        },

        update: function () {

            //physics.send('matrixArray', simulator.getMatrixArray() );

            if( isBuffer ) worker.postMessage( { m:'step', Ar:Ar }, [ Ar.buffer ] );
            else worker.postMessage( { m:'step' } );

        },

        start: function ( o ) {

            stepNext = true;


            // create tranfere array if buffer
            if( isBuffer ) Ar = new Float32Array( ArMax );

            if( meshData.length > 0 ){

                worker.postMessage( { m:'addMulty', o:meshData } );
                meshData = [];

            } 

            if ( !timer ) timer = requestAnimationFrame( physics.sendData );

        },

        step: function () {

            //if ( (time - 1000) > temp ){ temp = time; fps = count; count = 0; }; count++;
            physics.isStart = true;
            //view.phyStep = true;

            simulator.step();


            stepNext = true;
            
        },

        sendData: function ( stamp ){

            //if( view.pause ){ timer = null; return; }

            timer = requestAnimationFrame( physics.sendData );

            time = stamp;// === undefined ? now() : stamp;
            delta = time - then;

            if ( delta > timerate ) {

                then = time - ( delta % timerate );

                if( stepNext ){

                    physics.update();

                    //if( isBuffer ) worker.postMessage( { m:'step', Ar:Ar }, [ Ar.buffer ] );
                    //else worker.postMessage( { m:'step' } );
                    
                    stepNext = false;

                }

                //tell( 'three '+ view.getFps() + ' / ammo ' + fps );

            }

        },

        sendTmp: function ( m, o ) {

            if( m === 'add' ){
                meshData.push( o );
            }
        },

        send: function ( m, o ) {

            if( m === 'contact' ){ contactCallback.push(o.f); delete(o.f); }

            if( m === 'set' ){ 
                o = o || {};
                if( o.fps !== undefined ) timerate = (1/o.fps) * 1000;
            }

            worker.postMessage( { m:m, o:o } );

        },

        stop: function () {

            if ( timer ) {
               window.cancelAnimationFrame( timer );
               timer = undefined;
            }

        },

        reset: function( full ) {

            if( !worker ) return;

            if ( timer ) {
               window.cancelAnimationFrame( timer );
               timer = undefined;
            }

            contactCallback = [];
            
            simulator.clear();

            worker.postMessage( { m:'reset', full:full });

        },

        destroy: function (){

            worker.terminate();
            worker = undefined;

        },

        add: function ( o ) {

            return simulator.add( o );

        },
        
    }

    return physics;

})();


var simulator = ( function () {

    'use strict';

    var bodys = [];
    var solids = [];
    var extraGeo = [];

    var geo = null;
    var mat = null;

    simulator = {

        byName: {},

        clear: function (){

            simulator.byName = {};

            while( extraGeo.length > 0 ) extraGeo.pop().dispose();
            while( bodys.length > 0 ) physicsGroup.remove( bodys.pop() );
            while( solids.length > 0 ) physicsGroup.remove( solids.pop() );

        },

        step: function(){

            if( !physics.isStart ) return;

            if( !bodys.length ) return;

            bodys.forEach( function( b, id ) {

                var n = ( id * 8 );
                b.position.fromArray( Ar, n + 1 );
                b.quaternion.fromArray( Ar, n + 4 );

            });

            //simulator.applyPhysicsBone()

        },


        add: function ( o ) {

            if( geo === null ){
                geo = {

                    plane:    new THREE.PlaneBufferGeometry(1,1,1,1),
                    box:      new THREE.BoxBufferGeometry(1,1,1),
                    cone:     new THREE.CylinderBufferGeometry( 0,1,0.5 ),
                    sphere:   new THREE.SphereBufferGeometry( 1, 16, 12 ),
                    cylinder: new THREE.CylinderBufferGeometry( 1,1,1,12,1 ),

                }

                geo.plane.rotateX( -Math.PI90 );

            }

            if( mat === null ){
                mat = {
                    kinematic: new THREE.MeshBasicMaterial( { color:0x003300, transparent:true, opacity:0.25, wireframe:true } ),
                    static: new THREE.MeshBasicMaterial( { color:0x000033, transparent:true, opacity:0.25, wireframe:true } ),
                    //move: new THREE.MeshBasicMaterial( { color:0x330000, transparent:true, opacity:0.25, wireframe:true } )
                    move: new THREE.MeshStandardMaterial( { color:0xaa4400, shadowSide:false, envMap: environement.envmap } )
                }
            }

            o.type = o.type === undefined ? 'box' : o.type;

            var isCustomGeometry = false;
            var isKinematic = o.kinematic !== undefined ? o.kinematic : false;

            if( o.density !== undefined ) o.mass = o.density;
            else o.density = o.mass;

            o.mass = o.mass === undefined ? 0 : o.mass;
            
            var moveType = 1;
            if( o.move !== undefined ) moveType = 0;// dynamic
            //if( o.density !== undefined ) moveType = 0;
            if( o.mass !== 0 ) moveType = 0;
            if( isKinematic ) moveType = 2;

           
            // position
            o.pos = o.pos === undefined ? [0,0,0] : o.pos;

            // size
            o.size = o.size === undefined ? [1,1,1] : o.size;
            if( o.size.length === 1 ){ o.size[1] = o.size[0]; }
            if( o.size.length === 2 ){ o.size[2] = o.size[0]; }

            if(o.geoSize){
                if(o.geoSize.length == 1){ o.geoSize[1] = o.geoSize[0]; }
                if(o.geoSize.length == 2){ o.geoSize[2] = o.geoSize[0]; }
            }

            // rotation is in degree
            o.rot = o.rot === undefined ? [0,0,0] : Math.vectorad(o.rot);
            o.quat = o.quat === undefined ? new THREE.Quaternion().setFromEuler( new THREE.Euler().fromArray( o.rot ) ).toArray() : o.quat;

            if(o.rotA) o.quatA = new THREE.Quaternion().setFromEuler( new THREE.Euler().fromArray( Math.vectorad( o.rotA ) ) ).toArray();
            if(o.rotB) o.quatB = new THREE.Quaternion().setFromEuler( new THREE.Euler().fromArray( Math.vectorad( o.rotB ) ) ).toArray();

            if(o.angUpper) o.angUpper = Math.vectorad( o.angUpper );
            if(o.angLower) o.angLower = Math.vectorad( o.angLower );

            var mesh = null;
            var material;
            if(isKinematic) material = mat.kinematic;
            else material = o.mass === 0 ? mat.static: mat.move;

            if(o.type.substring(0,5) === 'joint') {

                physics.send( 'add', o );
                return;

            }

            if(o.type === 'plane'){
                //this.grid.position.set( o.pos[0], o.pos[1], o.pos[2] )
                physics.send( 'add', o ); 
                return;
            }
            
            if( o.type === 'capsule' ){

                var g = new THREE.CapsuleBufferGeometry( o.size[0]  , o.size[1]*0.5 );
                mesh = new THREE.Mesh( g, material );
                extraGeo.push( mesh.geometry );
                isCustomGeometry = true;

            } else {

                mesh = new THREE.Mesh( geo[o.type], material );
                
            }


            if( mesh ){

                if( !isCustomGeometry ) mesh.scale.fromArray( o.size );
                mesh.position.fromArray( o.pos );
                mesh.quaternion.fromArray( o.quat );

                //mesh.receiveShadow = true;
                mesh.castShadow = moveType !== 1 ? true : false;

                if( o.name === undefined ) o.name =  moveType !== 1 ? 'b'+ bodys.length : 'f'+ solids.length;
                mesh.name = o.name;

                physicsGroup.add( mesh );
                
            }
            
            if( o.noPhy === undefined ){

                // push 
                if( mesh ){

                    // static
                    if( moveType === 1 && !isKinematic ) solids.push( mesh );
                    // dynamique
                    else bodys.push( mesh );

                }

                // send to worker
                physics.sendTmp( 'add', o );

            }

            if( mesh ){ 

                mesh.castShadow = true;//false;
                mesh.receiveShadow = true;//false;
                if( o.name ) simulator.byName[ o.name ] = mesh;
                return mesh;

            }

        },
        
    }

    return simulator;

})();