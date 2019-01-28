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

        extraUpdate: function () {

        }, 

        load: function ( Callback, Option ) {

            console.log('load')

            var xhr = new XMLHttpRequest(); 
            xhr.responseType = "arraybuffer";
            xhr.open( 'GET', "./worker/ammo.hex", true );

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
                soft: Option.soft || true,

                //penetration: Option.penetration || 0.0399,


            };

            timerate = (1/option.fps) * 1000;

            worker = new Worker('./worker/ammo.worker.js');
            worker.onmessage = this.message;
            worker.postMessage = worker.webkitPostMessage || worker.postMessage;

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

            physics.send( 'matrixArray', simulator.getSkeletontMatrix() );
            physics.extraUpdate()

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

        addSkeleton: function () {

            return simulator.addSkeleton();

        },

        getBodys: function () {

            return simulator.getBodys();

        },

        getMeshBones: function () {

            return simulator.getMeshBones();

        },

        show: function ( b ) {

            simulator.show( b );

        },

        getShow: function () {

            return simulator.getShow();
            
        },
        
    }

    return physics;

})();


var simulator = ( function () {

    'use strict';

    var bodys = [];
    var solids = [];
    var extraGeo = [];

    var meshBones = [];
    var linkBones = [];

    var geo = null;
    var mat = null;

    var torad = 0.0174532925199432957;
    var PI90 = 1.570796326794896;

    var isSkeleton = false;
    var isShow = false;

    simulator = {

        byName: {},

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

        getMeshBones: function (){
            
            return meshBones;

        },


        getBodys: function (){
            
            return bodys;

        },

        show: function ( b ) {

            isShow = b;
            if( mat === null ) return;
            mat.kinematic.visible = b;
            mat.static.visible = b;
            
        },

        getShow: function () {

            return isShow;
            
        },

        clear: function (){

            simulator.byName = {};

            while( extraGeo.length > 0 ) extraGeo.pop().dispose();
            while( bodys.length > 0 ) physicsGroup.remove( bodys.pop() );
            while( solids.length > 0 ) physicsGroup.remove( solids.pop() );

            meshBones = [];
            isSkeleton = false;

        },

        getSkeletontMatrix: function () {
            
            var r = [];

            if( !meshBones.length ) return r;

            meshBones.forEach( function( b ) {

                if( b.userData.isKinematic ) r.push( b.userData.matrix );

            });

            return r;

        },

        addSkeleton: function () {

            if( isSkeleton ) return;

            var fingers = [ 'Thumb', 'Index', 'Mid', 'Ring', 'Pinky' ];

            // get character bones 
            var bones = character.skeleton.bones;

            var p = new THREE.Vector3();
            var s = new THREE.Vector3();
            var q = new THREE.Quaternion();
            var e = new THREE.Euler();
            var mtx = new THREE.Matrix4();

            var tmpMtx = new THREE.Matrix4();
            var tmpMtxR = new THREE.Matrix4();
            //var tmpMtxInv = new THREE.Matrix4();
            
            //var tmpMtxR2 = new THREE.Matrix4();

            var p1 = new THREE.Vector3();
            var p2 = new THREE.Vector3();
            var i, lng = bones.length, name, n, bone, child, o, parentName;
            var size, dist, type, mesh, r, kinematic, translate;

            for( i = 0; i < lng; i++ ){

                type = null;
                parentName = null;

                bone = bones[i];
                name = bone.name;

                if( bone.parent && bone.parent.isBone ) {

                    n = bone.parent.name;
                    r = 90;

                    // get distance between bone and parent
                    p1.setFromMatrixPosition( bone.parent.matrixWorld );
                    p2.setFromMatrixPosition( bone.matrixWorld );
                    dist = p1.distanceTo( p2 );

                    translate = [ -dist * 0.5, 0, 0 ];
                    size = [ dist, 1, 1 ];
                    kinematic = true;

                    // body
                    if( n==='head' ){ type = 'capsule'; size = [ 7.5, 8.6, 7.5 ]; r = 90; }
                    if( n==='neck' && name==='head' ){    type = 'box'; size = [ dist, 6, 6 ]; r = 0; }
                    if( n==='chest' && name==='neck' ){   type = 'box'; size = [ dist, 15, 13 ]; r = 0; }
                    if( n==='abdomen' && name==='chest'){ type = 'box'; size = [ dist, 14, 12 ]; r = 0; }
                    //if( n==='hip' && name==='abdomen' ){  type = 'box'; size = [ dist, 13, 11 ]; r = 0; }
                    if( n==='hip' && name==='abdomen' ){  type = 'capsule'; size = [ 4, 24.4, 4 ]; r = 0; translate = [ 0, 0, 0 ]}
                    // arms
                    if( n==='lCollar' || n==='rCollar' ){    type = 'cylinder'; size = [ 3, dist, 3 ]; }
                    if( n==='rShldr' && name==='rForeArm' ){ type = 'cylinder'; size = [ 3, dist, 3 ]; }
                    if( n==='lShldr' && name==='lForeArm' ){ type = 'cylinder'; size = [ 3, dist, 3 ]; }
                    if( n==='rForeArm' && name==='rHand' ){  type = 'cylinder'; size = [ 2.6, dist, 2.6 ]; }
                    if( n==='lForeArm' && name==='lHand' ){  type = 'cylinder'; size = [ 2.6, dist, 2.6 ]; }
                    // hand
                    if( n==='rHand' && name==='rMid1' ){  type = 'box'; size = [ dist, 2, 4 ]; r = -5; translate = [ -dist * 0.5, 0.5, 0 ]}
                    if( n==='lHand' && name==='lMid1' ){  type = 'box'; size = [ dist, 2, 4 ]; r = 5; translate = [ -dist * 0.5, -0.5, 0 ]}
                    // fingers
                    var f = n.substring( 1, n.length-1 );
                    var fnum = 4 - Number(n.substring( n.length-1 ));
                    if( fingers.indexOf(f) !== -1 ){
                        var s = f === 'Thumb' ? 1+(fnum*0.25) : s = 1+(fnum*0.1);
                        type = 'box'; size = [ dist, s, s ]; r=0; 
                    }

                    // legs
                    if( n==='rThigh' && name==='rShin' ){ type = 'cylinder'; size = [ 4, dist, 4 ]; }
                    if( n==='lThigh' && name==='lShin' ){ type = 'cylinder'; size = [ 4, dist, 4 ]; }
                    if( n==='rShin' && name==='rFoot' ){  type = 'cylinder'; size = [ 3, dist, 3 ]; }
                    if( n==='lShin' && name==='lFoot' ){  type = 'cylinder'; size = [ 3, dist, 3 ]; }
                    // foot
                    if( n==='rFoot' && name==='rToes' ){ type = 'box'; size = [ 4, 5, 9 ]; r = 0; translate = [ -1, 0, -2.5 ]; }
                    if( n==='lFoot' && name==='lToes' ){ type = 'box'; size = [ 4, 5, 9 ]; r = 0; translate = [ -1, 0, -2.5 ]; }
                    if( n==='rToes' ){ type = 'box'; size = [ dist+1, 5, 3 ]; r = 0; translate = [ (-dist * 0.5)-0.5, 0, -1.5 ];}
                    if( n==='lToes' ){ type = 'box'; size = [ dist+1, 5, 3 ]; r = 0; translate = [ (-dist * 0.5)-0.5, 0, -1.5 ];}


                    if( type !== null ){

                        // translation
                        tmpMtx.makeTranslation( translate[0], translate[1], translate[2] );
                        //tmpMtxInv.makeTranslation( -translate[0], -translate[1], -translate[2] );
                        // rotation
                        if( r!==0 ){

                            tmpMtxR.makeRotationFromEuler( e.set( 0, 0, r*torad ) );
                            tmpMtx.multiply( tmpMtxR );

                            //tmpMtxR2.makeRotationFromEuler( e.set( 0, 0, -r*torad ) );
                            //tmpMtxInv.multiply( tmpMtxR2 );

                        }
                         
                        mtx.multiplyMatrices( bone.parent.matrixWorld, tmpMtx );
                        mtx.decompose( p, q, s );

                        var mass = (size[0]+size[1]+size[2])*0.1;

                        mesh = simulator.add({

                            name: n,
                            mass:mass,
                            type: type,
                            size: size,
                            pos: p.toArray(),
                            quat: q.toArray(),
                            kinematic: kinematic,
                            friction: 0.5,//kinematic ? 0 : 1, 
                            restitution:0.1,

                            //linear: kinematic ? 0 : 0.5,
                            //angular: kinematic ? 0 : 2,

                            //group: kinematic ? 1 : 2,
                            //mask: kinematic ? 2 : 1,

                            neverSleep: true,

                        });

                        mesh.userData.isKinematic = kinematic;
                        mesh.userData.decal = tmpMtx.clone();
                        mesh.userData.decalinv = new THREE.Matrix4().getInverse( tmpMtx );//tmpMtxInv.clone();

                        mesh.userData.matrix = [ n, p.toArray(), q.toArray() ];
                        //mesh.userData.dist = dist;

                        //mesh.userData.top = bone.parent.position.clone();
                        //mesh.userData.quat = bone.parent.quaternion.clone().multiply(revQ).normalize();

                        mesh.userData.bone = bone.parent;
                        mesh.userData.parentName = parentName;

                        bone.parent.userData.mesh = mesh;
                        bone.parent.userData.isPhysics = true;
                        bone.parent.userData.isKinematic = kinematic;

                        //bone.userData.mesh = mesh;
                        //bone.userData.isPhysics = true;
                        //bone.userData.isKinematic = kinematic;
                        

                        if( kinematic ) meshBones.push( mesh );
                        //else linkBones.push( mesh );

                    }
                }

            }

            isSkeleton = true;

        },

        removeSkeleton: function () {

            if( !isSkeleton ) return;

            // clear physics engine
            //physics.reset( true );

            meshBones = [];

            isSkeleton = false;
            //isInit = false;

        },

        add: function ( o ) {

            if( geo === null ){
                geo = {

                    plane:    new THREE.PlaneBufferGeometry(1,1,1,1),
                    box:      new THREE.BoxBufferGeometry(1,1,1),
                    cone:     new THREE.CylinderBufferGeometry( 0,1,0.5 ),
                    sphere:   new THREE.SphereBufferGeometry( 1, 24, 18 ),//16, 12
                    cylinder: new THREE.CylinderBufferGeometry( 1,1,1, 12, 1 ),

                }

                geo.plane.rotateX( -PI90 );

            }

            if( mat === null ){

                mat = {
                    kinematic: new THREE.MeshBasicMaterial( { color:0xdb0bfa, transparent:true, opacity:0.25, wireframe:true } ),
                    static: new THREE.MeshBasicMaterial( { color:0x333333, transparent:true, opacity:0.25, wireframe:true } ),
                    move: new THREE.MeshBasicMaterial( { color:0x330000, transparent:true, opacity:0.25, wireframe:true } ),
                }

                

            }

            mat.kinematic.visible = isShow;
            mat.static.visible = isShow;

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
            o.rot = o.rot === undefined ? [0,0,0] : simulator.vectorad( o.rot );
            o.quat = o.quat === undefined ? new THREE.Quaternion().setFromEuler( new THREE.Euler().fromArray( o.rot ) ).toArray() : o.quat;

            if(o.rotA) o.quatA = new THREE.Quaternion().setFromEuler( new THREE.Euler().fromArray( simulator.vectorad( o.rotA ) ) ).toArray();
            if(o.rotB) o.quatB = new THREE.Quaternion().setFromEuler( new THREE.Euler().fromArray( simulator.vectorad( o.rotB ) ) ).toArray();

            if(o.angUpper) o.angUpper = simulator.vectorad( o.angUpper );
            if(o.angLower) o.angLower = simulator.vectorad( o.angLower );

            var mesh = null;
            var material;
            if( isKinematic ) material = mat.kinematic;
            else material = o.mass === 0 ? mat.static : mat.move;

            if( o.material !== undefined ) material = o.material;

            if(o.type.substring(0,5) === 'joint') {

                physics.send( 'add', o );
                return;

            }

            if(o.type === 'plane'){

                physics.send( 'add', o ); 
                return;

            }
            
            if( o.type === 'capsule' ){

                var g = new THREE.CapsuleBufferGeometry( o.size[0], o.size[1]*0.5 );
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

                // send to physics worker
                physics.sendTmp( 'add', o );

            }

            if( mesh ){ 

                mesh.castShadow = o.material !== undefined ? true : false;
                mesh.receiveShadow = o.material !== undefined ? true : false;
                simulator.byName[ mesh.name ] = mesh;
                return mesh;

            }

        },

        vectorad: function ( r ) {

            var i = r.length;
            while(i--) r[i] *= torad;
            return r;

        },
        
    }

    return simulator;

})();