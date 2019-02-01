/**   _  _____ _   _   
*    | ||_   _| |_| |
*    | |_ | | |  _  |
*    |___||_| |_| |_|
*    @author lo.th / https://github.com/lo-th
*
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

    var isRagdoll = false;


    physics = {

        isReady: false,
        isStart: false,

        extraUpdate: function () {

        }, 

        load: function ( Callback, Option ) {

            var xhr = new XMLHttpRequest(); 
            xhr.responseType = "arraybuffer";
            xhr.open( 'GET', "./js/worker/ammo.hex", true );

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

            worker = new Worker('./js/worker/ammo.worker.js');
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

            physics.send( 'setMatrix', simulator.getSkeletontMatrix() );
            physics.extraUpdate();

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

        /*addSkeleton: function () {

            return simulator.addSkeleton();

        },

        getBodys: function () {

            return simulator.getBodys();

        },

        getMeshBones: function () {

            return simulator.getMeshBones();

        },

        getShow: function () {

            return simulator.getShow();
            
        },*/

    }

    return physics;

})();


var simulator = ( function () {

    'use strict';

    var bodys = [];
    var solids = [];
    var extraGeo = [];

    //var meshBones = [];
    //var linkBones = [];

    var geo = null;
    var mat = null;

    var torad = 0.0174532925199432957;
    var PI90 = 1.570796326794896;
    var epsilon = 0.00000001;

    var physicsSkeleton = null;
    var numBall = 100;

    var byName = {};

    simulator = {

        isRagdoll: false,
        isBall: false,
        isSkeleton: false,
        isShow: false,


        step: function(){

            if( !physics.isStart ) return;
            if( !bodys.length ) return;



            bodys.forEach( function( b, id ) {

                var n = ( id * 8 );
                b.position.fromArray( Ar, n + 1 );
                b.quaternion.fromArray( Ar, n + 4 );

            });

            

        },

        //________________________________________________________BALL

        ball: function ( b ) {

            if( b ) simulator.addBall();
            else simulator.removeBall();

        },

        ballUpdate: function () {

            if( !simulator.isBall ) return;

            var i = bodys.length, b, name;

            var r = [];

            while(i--){

                b = bodys[i];
                
                if( b.position.y < -20 ){ 

                    name = b.name.substring(0,4);
                    if( name === 'ball' ) r.push( [ b.name, [ random(-30,30), random(100,200), random(-30,30) ]] );

                }
            }

            physics.send( 'setMatrix', r );

        },

        addBall: function () {

            if( simulator.isBall ) return;

            var material = new THREE.MeshStandardMaterial( { color: 0x505050, envMap:environement.envmap, metalness:0.7, roughness:0.4, transparent:true, opacity:0.5 } );
            var i = numBall;
            while( i-- ) simulator.add({ type:'sphere', name:'ball'+i, size:[random(20,50)*0.1], pos:[random(-30,30),100+(i*3),random(-30,30)], mass:1, friction:0.5, restitution:0.2, material:material, group:0, mask:0|1|2 });
            simulator.isBall = true;

            physics.extraUpdate = simulator.ballUpdate;

        },

        removeBall: function (){

            if( !simulator.isBall ) return;

            var r = [];
            var i = numBall, id, name, b, n;
            while( i-- ){
                name = 'ball'+i;
                b = byName[ name ];
                n = bodys.indexOf( b );
                if( n!==-1 ){ 
                    r.push( name );
                    bodys.splice( n, 1 );
                    physicsGroup.remove( b );
                }

            }

            physics.send( 'remove', r );
            simulator.isBall = false;

        },

        //________________________________________________________

        ragdoll: function ( b ) {

            if( !simulator.isSkeleton ) return

            var nodes = physicsSkeleton.nodes;

            if( nodes === null ) return;

            var i = nodes.length, b;

            simulator.isRagdoll = b;

            var isK = simulator.isRagdoll ? false : true;

            var r = [];

            while(i--){

                b = nodes[i];
                b.userData.isKinematic = isK ? true : false;
                r.push({ 
                    name: b.name, 
                    flag: isK ? 2 : 0, 
                    gravity: isK ? false : true,
                    damping: isK ? [0,0] : [0.05,0.85],
                });

            }

            eyes.ragdoll( simulator.isRagdoll )

            physics.send( 'setOption', r );
            
        },

        getBodys: function (){
            
            return bodys;

        },

        show: function ( b ) {

            simulator.isShow = b;
            if( mat === null ) return;
            //mat.kinematic.visible = b;
            mat.static.visible = b;

            if( simulator.isSkeleton ) physicsSkeleton.show( b );
            
        },

        clear: function (){

            byName = {};

            while( extraGeo.length > 0 ) extraGeo.pop().dispose();
            while( bodys.length > 0 ) physicsGroup.remove( bodys.pop() );
            while( solids.length > 0 ) physicsGroup.remove( solids.pop() );

            //meshBones = [];

            simulator.removeSkeleton();

        },

        getSkeletontMatrix: function () {

            return simulator.isSkeleton ? physicsSkeleton.upMtx : [];

        },

        addSkeleton: function () {

            if( simulator.isSkeleton ) return;

            var nodes = [];

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

            var p1 = new THREE.Vector3();
            var p2 = new THREE.Vector3();
            var i, lng = bones.length, name, n, boneId, bone, parent;///, child, o, parentName;
            var size, dist, type, mesh, r, kinematic, translate;

            for( i = 0; i < lng; i++ ){

                type = null;
                bone = bones[i];
                name = bone.name;

                if( bone.parent && bone.parent.isBone ) {

                    parent = bone.parent;
                    n = parent.name;
                    boneId = bones.indexOf( parent );

                    r = 90;

                    // get distance between bone and parent
                    p1.setFromMatrixPosition( parent.matrixWorld );
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
                        // rotation
                        if( r!==0 ){
                            tmpMtxR.makeRotationFromEuler( e.set( 0, 0, r*torad ) );
                            tmpMtx.multiply( tmpMtxR );
                        }
                         
                        mtx.multiplyMatrices( parent.matrixWorld, tmpMtx );
                        mtx.decompose( p, q, s );

                        var mass = (size[0]+size[1]+size[2])//*0.1;

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

                            //group: kinematic ? 2 : 1,
                            //mask: kinematic ? 1 : 2,

                            neverSleep: true,

                        });

                        mesh.userData.isKinematic = kinematic;
                        mesh.userData.decal = tmpMtx.clone();
                        mesh.userData.decalinv = new THREE.Matrix4().getInverse( tmpMtx );
                        //mesh.userData.boneId = boneId;
                        mesh.userData.bone = parent;
                        //mesh.userData.r = r;
                        //mesh.userData.d = dist;

                        nodes.push( mesh );

                    }
                }

            }

            simulator.isSkeleton = true;

            simulator.addLinks();

            physicsSkeleton = new PhysicsSkeleton( character, nodes );
            physicsSkeleton.show( simulator.isShow );
            scene.add( physicsSkeleton );

        },

        removeSkeleton: function () {

            if( !simulator.isSkeleton ) return;
            
            scene.remove( physicsSkeleton );
            physicsSkeleton.clear();
            simulator.isSkeleton = false;

        },

        addLinks: function () {

            var low = [-45, -60, -45];
            var high = [45, 60, 45]

            simulator.makeLink(  'hip', 'abdomen',  [-10,-40,-10] , [10,40,10], 'joint_conetwist', [0,0,0], [0,0,0], [ -45, 45 ] );
            simulator.makeLink( 'abdomen', 'chest', low, high , 'joint_conetwist', [0,0,0], [0,0,0], [ -45, 45 ]);
            simulator.makeLink( 'chest', 'neck', low, high, 'joint_conetwist', [0,0,0], [0,0,0], [ -45, 45 ] );
            simulator.makeLink( 'neck', 'head', low, high, 'joint_conetwist', [0,0,0], [0,0,0], [ -45, 45 ] );

            for (var i = 0; i<2; i++){
                
                var s = i === 0 ? 'r' : 'l';

                low = [-45, -60, -45];
                high = [45, 60, 45]

                // leg
                //simulator.makeLink( 'hip', s + 'Thigh', [-90,-90,-90] , [90,90,90] );
                simulator.makeLink( 'hip', s + 'Thigh', [-90,-90,-90] , [90,90,90], 'joint_conetwist', [0,0,0], [0,0,0], [ -80, 80 ] );
                simulator.makeLink( s + 'Thigh', s + 'Shin', [-5,-180,-5] , [5,5,5], 'joint_hinge', [1,0,0], [1,0,0], [ -2, 160 ] );
                //simulator.makeLink( s + 'Thigh', s + 'Shin', [-5,-140,-5] , [5,5,5] );
                simulator.makeLink( s + 'Shin', s + 'Foot', [-45,-45,-45] , [45,45,45], 'joint_conetwist', [0,0,0], [0,0,0], [ -45, 45 ] );
                simulator.makeLink( s + 'Foot', s + 'Toes', [-5,-45,-5] , [5,45,5])///, 'joint_hinge', [1,0,0], [1,0,0], [ -45, 45 ] );

                // arm
                simulator.makeLink( 'chest', s + 'Collar', [-5,-5,-5] , [5,5,5])//, 'joint_conetwist', [0,0,0], [0,0,0], [ -2, 2 ] );
                simulator.makeLink( s + 'Collar', s + 'Shldr', low , high, 'joint_conetwist', [0,0,0], [0,0,0], [ -160, 160 ] );
                simulator.makeLink( s + 'Shldr' , s + 'ForeArm', [-5,-180,-5] , [5,5,5], 'joint_hinge', [1,0,0], [1,0,0], [ -2, 160 ] );
                simulator.makeLink( s + 'ForeArm', s + 'Hand', [0,-10,0] , [0,10,0], 'joint_conetwist', [0,0,0], [0,0,0], [ -45, 45 ] );

                // finger

                low = [0, 0, -90];
                high = [0, 0, 90]

                var aa = i === 0 ? [ -90, 0 ] : [ 0, 90 ]

                simulator.makeLink( s + 'Hand', s + 'Thumb1', low , high, 'joint_hinge', [0,0,1], [0,0,1], aa );
                simulator.makeLink( s + 'Thumb1', s + 'Thumb2', low , high, 'joint_hinge', [0,0,1], [1,0,0], aa );
                simulator.makeLink( s + 'Thumb2', s + 'Thumb3', low , high, 'joint_hinge', [0,0,1], [0,0,1], aa );

                simulator.makeLink( s + 'Hand', s + 'Index1', low , high, 'joint_hinge', [0,0,1], [0,0,1], aa );
                simulator.makeLink( s + 'Index1', s + 'Index2', low , high, 'joint_hinge', [0,0,1], [0,0,1], aa );
                simulator.makeLink( s + 'Index2', s + 'Index3', low , high, 'joint_hinge', [0,0,1], [0,0,1], aa );

                simulator.makeLink( s + 'Hand', s + 'Mid1', low , high, 'joint_hinge', [0,0,1], [0,0,1], aa );
                simulator.makeLink( s + 'Mid1', s + 'Mid2', low , high, 'joint_hinge', [0,0,1], [0,0,1], aa );
                simulator.makeLink( s + 'Mid2', s + 'Mid3', low , high, 'joint_hinge', [0,0,1], [0,0,1], aa );

                simulator.makeLink( s + 'Hand', s + 'Ring1', low , high, 'joint_hinge', [0,0,1], [0,0,1], aa );
                simulator.makeLink( s + 'Ring1', s + 'Ring2', low , high, 'joint_hinge', [0,0,1], [0,0,1], aa );
                simulator.makeLink( s + 'Ring2', s + 'Ring3', low , high, 'joint_hinge', [0,0,1], [0,0,1], aa );

                simulator.makeLink( s + 'Hand', s + 'Pinky1', low , high, 'joint_hinge', [0,0,1], [0,0,1], aa );
                simulator.makeLink( s + 'Pinky1', s + 'Pinky2', low , high, 'joint_hinge', [0,0,1], [0,0,1], aa );
                simulator.makeLink( s + 'Pinky2', s + 'Pinky3', low , high, 'joint_hinge', [0,0,1], [0,0,1], aa );

            }


        },

        makeLink: function ( A, B, low, high, type, a1, a2, limit ){

            var a = byName[ A ];
            var b = byName[ B ];

            var s = new THREE.Vector3();
            var p1 = new THREE.Vector3();
            var p2 = new THREE.Vector3();
            var q = new THREE.Quaternion();
            var q1 = new THREE.Quaternion();
            var q2 = new THREE.Quaternion();

            var mtx = new THREE.Matrix4();
            var m = new THREE.Matrix4();
            var m2 = new THREE.Matrix4();
            var e = new THREE.Euler();

            mtx.copy( b.userData.decalinv ).decompose( p2, q2, s );
            mtx.copy( a.userData.decalinv ).decompose( p1, q1, s );

            b.updateMatrixWorld( true );
            a.updateMatrixWorld( true );

            //mtx.copy( b.userData.decalinv ).multiply( a.matrixWorld );
            //m.multiplyMatrices( mtx, m2.getInverse( a.matrixWorld ) );
            //m.decompose( p1, q1, s );
            //mtx.multiply( m.getInverse( a.matrixWorld ) ).decompose( p1, q1, s );


            p1 = b.localToWorld( p2.clone() )
            p1 = a.worldToLocal( p1 );

            if( A==="hip" && B==="rThigh" ) q1.multiply( q.setFromEuler( e.set( 180*torad,180*torad,0 ) ) );
            if( A==="hip" && B==="lThigh" ) q1.multiply( q.setFromEuler( e.set( 180*torad,180*torad,0 ) ) );

            if( A==="chest" && B==="rCollar" ) q1.multiply( q.setFromEuler( e.set( 180*torad,0*torad,90*torad ) ) );
            if( A==="chest" && B==="lCollar" ) q1.multiply( q.setFromEuler( e.set( 180*torad,0*torad,-90*torad ) ) );

            if( A==="rForeArm" && B==="rHand" ) q1.multiply( q.setFromEuler( e.set( 180*torad,0*torad,0*torad ) ) );
            if( A==="lForeArm" && B==="lHand" ) q1.multiply( q.setFromEuler( e.set( 180*torad,0*torad,0*torad ) ) );

            if( A==="rFoot" && B==="rToes" ){ q2.multiply( q.setFromEuler( e.set( 0*torad,90*torad,0 ) ) ); }
            if( A==="lFoot" && B==="lToes" ){ q2.multiply( q.setFromEuler( e.set( 0*torad,90*torad,0 ) ) ); }
            //if(a.userData.r !== b.userData.r) {
              //  console.log(A,B)

             //   q1.multiply( q.setFromEuler( e.set( 0, 0, a.userData.r*torad ) ).inverse() );
            //    q2.multiply( q.setFromEuler( e.set( 0, 0, b.userData.r*torad ) ).inverse() );
            //}

            //p1 = p2.clone().applyMatrix4( b.matrixWorld );
            //p1.applyMatrix4( m.getInverse( a.matrixWorld ) );

            q1.normalize()
            q2.normalize()

          
            simulator.testPoint( a, p1, q1, 0xFFFF00 );
            simulator.testPoint( b, p2, q2, 0x00FFFF );

            //physics.sendTmp( 'add', simulator.link( A, B, p1.toArray(), p2.toArray(), q1.toArray(), q2.toArray(), low, high )  );
            physics.send( 'add', simulator.link( A, B, p1.toArray(), p2.toArray(), q1.toArray(), q2.toArray(), low, high, type, a1, a2,limit  )  );

        },

        testPoint: function ( mesh, p, q, color ){

            var m = new THREE.Mesh( new THREE.CircleBufferGeometry( 0.25, 5 ), new THREE.MeshBasicMaterial( { color:color }));
            m.rotation.x = -PI90
            var a = new Axes(1);
            var d = new THREE.ArrowHelper( undefined,undefined, 0.5, color, undefined, 0.15 );
            m.position.copy( p );
            m.quaternion.copy( q );
            mesh.add( m );
            m.add(a)
            m.add(d)

        },

        link: function ( b1, b2, pos1, pos2, q1, q2, low, high, type, a1, a2, limit ){

            var rlow = simulator.vectorad( low );
            var rhigh = simulator.vectorad( high );

            if( rlow[0] === 0 ) rlow[0] = -epsilon;
            if( rlow[1] === 0 ) rlow[1] = -epsilon;
            if( rlow[2] === 0 ) rlow[2] = -epsilon;

            if( rhigh[0] === 0 ) rhigh[0] = epsilon;
            if( rhigh[1] === 0 ) rhigh[1] = epsilon;
            if( rhigh[2] === 0 ) rhigh[2] = epsilon;

            //console.log(rlow,rhigh )

            return {

                //type:'joint',
                type: type || 'joint_spring_dof',
                //type:'joint_conetwist',
                //type:'joint_hinge',
                //type:'joint_dof',
                b1:b1, 
                b2:b2,
                pos1:pos1,
                pos2:pos2,
                quatA: q1 ? q1 : undefined,
                quatB: q2 ? q2 : undefined,

                useA:true,

                axe1: a1 || [1,0,0],
                axe2: a2 || [1,0,0],
                limit: limit || [ 45, 45, 0.9, 0.3, 1 ],
                //spring:[2,0.3,0.1],
                collision: false,

                

                
                linLower:[-epsilon,-epsilon,-epsilon],
                linUpper:[epsilon,epsilon,epsilon],
                //linLower:[-1,-1,-1],
                //linUpper:[1,1,1],

                angLower: rlow,
                angUpper: rhigh,

                //spring:[0,0,0,  0.5,0.5,0.5],
                //damping:[0,0,0,  0.01,0.01,0.01],

               // enableSpring:[0,true],
               // stiffness:[0, 39.478],
               // damping:[0, 0.01],
                

                //springPosition:[0,0,0],
                //springRotation:[0,1,0],

            }

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

            //mat.kinematic.visible = simulator.isShow;
            mat.static.visible = simulator.isShow;

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

            ;

            if(o.type.substring(0,5) === 'joint') {

                physics.send( 'add', o );
                return;

            }

            if(o.type === 'plane'){

                physics.send( 'add', o ); 
                return;

            }
            
            // mesh

            var mesh = null;
            var geometry = null;

            var material;

            if( isKinematic ) material = mat.kinematic;
            else material = o.mass === 0 ? mat.static : mat.move;

            if( o.material !== undefined ) material = o.material

            if( o.type === 'capsule' ) geometry = new THREE.CapsuleBufferGeometry( o.size[0], o.size[1]*0.5 );
            else{ 
                geometry = geo[o.type].clone();
                geometry.applyMatrix( new THREE.Matrix4().scale( new THREE.Vector3().fromArray( o.size ) ) );
            }

            extraGeo.push( geometry );
            mesh = new THREE.Mesh( geometry, material );

            mesh.position.fromArray( o.pos );
            mesh.quaternion.fromArray( o.quat );

            if( o.name === undefined ) o.name =  moveType !== 1 ? 'b'+ bodys.length : 'f'+ solids.length;
            mesh.name = o.name;

            physicsGroup.add( mesh );
                
            
            if( o.noPhy === undefined ){

                // push 
                if( mesh ){

                    // static
                    if( moveType === 1 && !isKinematic ) solids.push( mesh );
                    // dynamique
                    else bodys.push( mesh );

                }

                // send to physics worker
                // physics.sendTmp( 'add', o );
                physics.send( 'add', o );

            }

            if( mesh ){ 

                mesh.castShadow = o.material !== undefined ? true : false;
                mesh.receiveShadow = o.material !== undefined ? true : false;
                byName[ mesh.name ] = mesh;
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