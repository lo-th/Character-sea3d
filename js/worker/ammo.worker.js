/**   _  _____ _   _   
*    | ||_   _| |_| |
*    | |_ | | |  _  |
*    |___||_| |_| |_|
*    @author lo.th / https://github.com/lo-th
*    @source https://github.com/lo-th/Ammo.lab
*
*    AMMO worker ultimate
*
*    By default, Bullet assumes units to be in meters and time in seconds. 
*    Moving objects are assumed to be in the range of 0.05 units, about the size of a pebble, 
*    to 10, the size of a truck. 
*    The simulation steps in fraction of seconds (1/60 sec or 60 hertz), 
*    and gravity in meters per square second (9.8 m/s^2).
*/

var Module = { TOTAL_MEMORY: 256*1024*1024 };
var epsilon = 0.00000001;
var Ammo, start;

var worldscale = 1;
var invScale = 1;

var world = null;
var worldInfo = null;
var solver, solverSoft, collision, dispatcher, broadphase, ghostPairCallback;
var isSoft = true;


var trans, pos, quat, posW, quatW, transW, gravity;
var tmpTrans, tmpPos, tmpQuat, origineTrans;
var tmpPos1, tmpPos2, tmpPos3, tmpPos4, tmpZero;
var tmpTrans1, tmpTrans2, tmpTransX, worldTrans;


var tmpForce = [];
var tmpMatrix = [];
var tmpOption = [];
var tmpClear = [];
// array
var bodys, solids, softs, joints, cars, heros, terrains, carsInfo, contacts, contactGroups;
// object
var byName;

var timestep = 1/60;

var substep = 8;// default is 1. 2 or more make simulation more accurate.
//var ddt = 1;
var key = [ 0,0,0,0,0,0,0,0 ];
var tmpKey = [ 0,0,0,0,0,0,0,0 ];

var isBuffer = false;



var currentCar = 0;

// main transphere array
var Ar, aAr;
var ArLng, ArPos, ArMax;



var fixedTime = 0.01667;
var last_step = Date.now();
var timePassed = 0;

var STATE = {
    ACTIVE : 1,
    ISLAND_SLEEPING : 2,
    WANTS_DEACTIVATION : 3,
    DISABLE_DEACTIVATION : 4,
    DISABLE_SIMULATION : 5
}

var FLAGS = {
    STATIC_OBJECT : 1,
    KINEMATIC_OBJECT : 2,
    NO_CONTACT_RESPONSE : 4,
    CUSTOM_MATERIAL_CALLBACK : 8,
    CHARACTER_OBJECT : 16,
    DISABLE_VISUALIZE_OBJECT : 32,
    DISABLE_SPU_COLLISION_PROCESSING : 64 
};

var GROUP = { 
    DEFAULT : 1, 
    STATIC : 2, 
    KINEMATIC : 4, 
    DEBRIS : 8, 
    SENSORTRIGGER : 16, 
    NOCOLLISION : 32,
    GROUP0 : 64,
    GROUP1 : 128,
    GROUP2 : 256,
    GROUP3 : 512,
    GROUP4 : 1024,
    GROUP5 : 2048,
    GROUP6 : 4096,
    GROUP7 : 8192,
    ALL : -1 
}




self.onmessage = function ( e ) {

    var data = e.data;
    var m = data.m;
    var o = data.o;

    // ------- buffer data
    if( data.Ar ) Ar = data.Ar;
    
    switch( m ){

        case 'init': init( data ); break;
        case 'step': step( data ); break;
        case 'start': start( data ); break;
        case 'reset': reset( data ); break;
        case 'set': set( o ); break;

        //case 'key': tmpKey = o.key; break;
        //case 'setDriveCar': currentCar = o.n; break;
        //case 'set': tmpset = data.o; break;

        //case 'moveSoftBody': moveSoftBody( o ); break;

        //case 'heroRotation': setHeroRotation( o.id, o.angle ); break;

        case 'add': add( o ); break;

        case 'addMulty': addMulty( o ); break;
        //case 'vehicle': addVehicle( o ); break;
        //case 'character': addCharacter( o ); break;
        //case 'terrain': terrainPostStep( o ); break;
        case 'worldscale': setworldscale( o ); break;
        case 'gravity': setGravity( o ); break;
        case 'anchor': anchor( o ); break;
        //case 'apply': apply( data.o ); break;


        case 'setForce': tmpForce = tmpForce.concat(o); break;
        case 'setMatrix': tmpMatrix = tmpMatrix.concat(o); break;
        case 'setOption': tmpOption = tmpOption.concat(o); break;

        case 'remove': tmpClear = tmpClear.concat(o); break;
        //case 'setVehicle': setVehicle( o ); break;

        case 'contact': addContact( o ); break;

    }

};


function preStep(){



};

function step( o ){

    // ------- pre step

    //key = o.key;

    

    // update matrix

    updateMatrix();

    // update option

    updateOption();

    // update forces

    updateForce();

    // update object to remove

    updateRemove();

    // terrain update

    //terrainUpdate();

    // ------- step
    world.stepSimulation( timestep, substep );
    
    //world.stepSimulation( o.delay, substep, timestep );
    //world.stepSimulation( dt, it, dt );

    //drive( currentCar );
    //move( 0 );

    
    stepRigidBody( Ar, ArPos[0] );
    //stepConstraint( Ar, ArPos[1] );
    //stepSoftBody( Ar, ArPos[2] );

    

    //stepContact();

    if( isBuffer ) self.postMessage({ m:'step', Ar:Ar, contacts:contacts },[ Ar.buffer ]);
    else self.postMessage( { m:'step', Ar:Ar, contacts:contacts } );

};


//--------------------------------------------------
//
//  WORLD
//
//--------------------------------------------------

function init ( o ) {

    isBuffer = o.isBuffer || false;

    ArLng = o.settings[0];
    ArPos = o.settings[1];
    ArMax = o.settings[2];

    // create tranfere array if buffer
    if( !isBuffer ) Ar = new Float32Array( ArMax );

    //

    importScripts( o.blob );

    Ammo().then( function( Ammo ) { 

        initMath();

        // active transform

        trans = new Ammo.btTransform();
        quat = new Ammo.btQuaternion();
        pos = new Ammo.btVector3();

        // hero Transform

        posW = new Ammo.btVector3();
        quatW = new Ammo.btQuaternion();
        transW = new Ammo.btTransform();

        // tmp Transform

        origineTrans = new Ammo.btTransform();

        tmpTrans = new Ammo.btTransform();
        tmpPos = new Ammo.btVector3();
        tmpQuat = new Ammo.btQuaternion();

        // extra vector

        tmpPos1 = new Ammo.btVector3();
        tmpPos2 = new Ammo.btVector3();
        tmpPos3 = new Ammo.btVector3();
        tmpPos4 = new Ammo.btVector3();

        tmpZero = new Ammo.btVector3( 0,0,0 );

        // extra transform

        worldTrans = new Ammo.btTransform();

        tmpTrans1 = new Ammo.btTransform();
        tmpTrans2 = new Ammo.btTransform();

        tmpTransX = new Ammo.btTransform();

        // gravity
        gravity = new Ammo.btVector3();

        addWorld( o.option );
        set( o.option );

        bodys = []; // 0
        softs = []; // 1
        joints = []; // 2
        cars = []; 
        carsInfo = [];
        heros = [];
        terrains = [];
        solids = [];

        contacts = [];
        contactGroups = [];

        // use for get object by name
        byName = {};

        self.postMessage( { m:'initEngine' } );

    });
    
};

function set( o ){

    o = o || {};

    setworldscale(  o.worldscale !== undefined ? o.worldscale : 1 );

    timestep = o.fps !== undefined ? 1/o.fps : 0.016;
    substep = o.substep !== undefined ? o.substep : 2;

    // gravity
    gravity.fromArray( o.gravity !== undefined ? o.gravity : [ 0, -9.81, 0 ] );

    //console.log(gravity.y())
    
    world.setGravity( gravity );

    if( isSoft ){
        worldInfo = world.getWorldInfo();
        worldInfo.set_m_gravity( gravity );
    }

    // penetration
    var dInfo = world.getDispatchInfo();
    if( o.penetration !== undefined ) dInfo.set_m_allowedCcdPenetration( o.penetration );// default 0.0399

}

function setworldscale ( n ) {

    worldscale = n;
    invScale = 1/worldscale;

};

function reset ( o ) {


    tmpForce = [];
    tmpMatrix = [];

    clearContact();
    clearJoint();
    clearRigidBody();
    //clearVehicle();
   // clearTerrain();
    //clearCharacter();
    //clearSoftBody();

    // clear body name object
    byName = {};

    if( o.full ){

        clearWorld();
        self.postMessage({ m:'destroy' });
        //addWorld();

    }

    //setGravity();

    // create self tranfere array if no buffer
    //if( !isBuffer ) Ar = new Float32Array( ArMax );

    //self.postMessage({ m:'start' });

};



function wipe (obj) {
    for (var p in obj) {
        if ( obj.hasOwnProperty( p ) ) delete obj[p];
    }
};

//--------------------------------------------------
//
//  ADD
//
//--------------------------------------------------

function addMulty ( o ) {

    for( var i=0, lng=o.length; i< lng; i++ ){

        add( o[i] );

    }

    o = [];

};

function add ( o, extra ) {

    o.type = o.type === undefined ? 'box' : o.type;

    var type = o.type;
    var prev = o.type.substring( 0, 4 );

    if( prev === 'join' ) addJoint( o );
    //else if( prev === 'soft' || type === 'ellipsoid'  || type === 'rope'  || type === 'cloth' ) addSoftBody( o );
    //else if( type === 'terrain' ) addTerrain( o );
    else addRigidBody( o, extra );

};


function anchor( o ){

    getByName(o.soft).appendAnchor( o.pos, getByName(o.body), false, o.influence || 0.5 );

};

//--------------------------------------------------
//
//  RAY
//
//--------------------------------------------------

function addRay ( o ) {

    if( o.p1 !== undefined ) tmpPos1.fromArray( o.p1 );
    if( o.p2 !== undefined ) tmpPos2.fromArray( o.p2 );

    var rayCallback = new Ammo.ClosestRayResultCallback( tmpPos1, tmpPos2 );
    world.rayTest( tmpPos1, tmpPos2, rayCallback );

    //if(rayCallback.hasHit()){
       // printf("Collision at: <%.2f, %.2f, %.2f>\n", rayCallback.m_hitPointWorld.getX(), rayCallback.m_hitPointWorld.getY(), rayCallback.m_hitPointWorld.getZ());
   // }

};

//--------------------------------------------------
//
//  GET OBJECT
//
//--------------------------------------------------

function getByName( n ){

    return byName[ n ] || null;

}

function getByIdx( n ){

    var u = n.toFixed(1);
    var id = parseInt( u );
    var range = Number( u.substring( u.lastIndexOf('.') + 1 ));

    switch( range ){

        case 1 : return heros[id]; break;
        case 2 : return cars[id]; break;
        case 3 : return bodys[id]; break;
        case 4 : return solids[id]; break;
        case 5 : return terrains[id]; break;
        case 6 : return softs[id]; break;
        case 7 : return joints[id]; break;

    }

}


//---------------------
// FORCES
//---------------------

function updateForce () {

    while( tmpForce.length > 0 ) applyForce( tmpForce.pop() );

}

function applyForce ( r ) {

    var b = getByName( r[0] );

    if( b === null ) return;

    var type = r[1] || 'force';

    if( r[2] !== undefined ) tmpPos1.fromArray( r[2] );
    if( r[3] !== undefined ) tmpPos2.fromArray( r[3] );
    else tmpPos2.zero();

    switch( type ){
        case 'force' : case 0 : b.applyForce( tmpPos1, tmpPos2 ); break;// force , rel_pos 
        case 'torque' : case 1 : b.applyTorque( tmpPos1 ); break;
        case 'localTorque' : case 2 : b.applyLocalTorque( tmpPos1 ); break;
        case 'forceCentral' :case 3 :  b.applyCentralForce( tmpPos1 ); break;
        case 'forceLocal' : case 4 : b.applyCentralLocalForce( tmpPos1 ); break;
        case 'impulse' : case 5 : b.applyImpulse( tmpPos1, tmpPos2 ); break;// impulse , rel_pos 
        case 'impulseCentral' : case 6 : b.applyCentralImpulse( tmpPos1 ); break;

        // joint

        case 'motor' : case 7 : b.enableAngularMotor( true, r[2][0], r[2][1] ); break; // bool, targetVelocity, maxMotorImpulse

    }
    

}

//---------------------
// REMOVE
//---------------------

function updateRemove () {

    while( tmpClear.length > 0 ) applyRemove( tmpClear.pop() );

}

function applyRemove ( name ) {

    //onsole.log(name)
    removeRigidBody( name );

}

//---------------------
// OPTION
//---------------------

// ___________________________FLAG
//  1  : STATIC_OBJECT
//  2  : KINEMATIC_OBJECT
//  4  : NO_CONTACT_RESPONSE
//  8  : CUSTOM_MATERIAL_CALLBACK
//  16 : CHARACTER_OBJECT
//  32 : DISABLE_VISUALIZE_OBJECT
//  64 : DISABLE_SPU_COLLISION_PROCESSING

// ___________________________STATE
//  1  : ACTIVE
//  2  : ISLAND_SLEEPING
//  3  : WANTS_DEACTIVATION
//  4  : DISABLE_DEACTIVATION
//  5  : DISABLE_SIMULATION

function updateOption () {

    while( tmpOption.length > 0 ) applyOption( tmpOption.pop() );

}

function applyOption ( o ) {

    var b = getByName( o.name );

    if( b === undefined ) return;
    if( b === null ) return;

    if( o.flag !== undefined ) b.setCollisionFlags( o.flag );
    if( o.state !== undefined ) b.setMotionState( o.state );

    if( o.friction !== undefined ) b.setFriction( o.friction );
    if( o.restitution !== undefined ) b.setRestitution( o.restitution );
    if( o.damping !== undefined ) b.setDamping( o.damping[0], o.damping[1] );
    if( o.rollingFriction !== undefined ) b.setRollingFriction( o.rollingFriction );

    if( o.linearVelocity !== undefined ) b.setLinearVelocity( tmpPos1.fromArray(o.linearVelocity) );
    if( o.angularVelocity !== undefined ) b.setAngularVelocity( o.angularVelocity );

    if( o.linearFactor !== undefined ) b.setLinearFactor( tmpPos1.fromArray(o.linearFactor) );
    if( o.angularFactor !== undefined ) b.setAngularFactor( o.angularFactor );

    if( o.anisotropic !== undefined ) b.setAnisotropicFriction( anisotropic[0], anisotropic[1] );
    if( o.sleeping !== undefined ) b.setSleepingThresholds( sleeping[0], sleeping[1] );
    if( o.massProps !== undefined ) b.setMassProps( massProps[0], massProps[1] );

    if( o.gravity !== undefined ) { if(o.gravity) b.setGravity( gravity ); else b.setGravity( tmpZero ) }

}

//---------------------
// MATRIX
//---------------------

function updateMatrix () {

    while( tmpMatrix.length > 0 ) applyMatrix( tmpMatrix.pop() );

}

function applyMatrix ( r ) {

    var isOr = false;

    var b = getByName( r[0] );

    if( b === undefined ) return;
    if( b === null ) return;

    if( worldscale !== 1 && r[1] !== undefined ) {
        r[1] = vectomult( r[1], invScale );
    }

    var isK = b.isKinematic || false;

    if(r[3]){ // keep original position

        b.getMotionState().getWorldTransform( origineTrans );
        var or = [];
        origineTrans.toArray( or );
        var i = r[3].length, a;

        isOr = true;

        while(i--){

            a = r[3][i];
            if( a === 'x' ) r[1][0] = or[0]-r[1][0];
            if( a === 'y' ) r[1][1] = or[1]-r[1][1];
            if( a === 'z' ) r[1][2] = or[2]-r[1][2];
            if( a === 'rot' ) r[2] = [ or[3], or[4], or[5], or[6] ];

        }
    }

    

    tmpTransX.setIdentity();

    if( r[1] !== undefined ) { tmpPos.fromArray( r[1] ); tmpTransX.setOrigin( tmpPos );}
    if( r[2] !== undefined ) { tmpQuat.fromArray( r[2] ); tmpTransX.setRotation( tmpQuat );}
    //else { tmpQuat.fromArray( [2] ); tmpTrans.setRotation( tmpQuat ); }

    if(!isK && !isOr){
       // zero force
       b.setAngularVelocity( tmpZero );
       b.setLinearVelocity( tmpZero );

    }

    if(!isK ){
        b.setWorldTransform( tmpTransX );
        b.activate();
    } else{
        //
        //b.setCenterOfMassTransform( worldTrans );
        b.getMotionState().setWorldTransform( tmpTransX );
        //b.setWorldTransform( tmpTransX );
        
        //b.activate();
    }

}

//--------------------------------------------------
//
//  WORLD
//
//--------------------------------------------------

function clearWorld () {

    //world.getBroadphase().resetPool( world.getDispatcher() );
    //world.getConstraintSolver().reset();

    Ammo.destroy( world );
    Ammo.destroy( solver );
    if( solverSoft !== null )Ammo.destroy( solverSoft );
    Ammo.destroy( collision );
    Ammo.destroy( dispatcher );
    Ammo.destroy( broadphase );

    world = null;

};

function addWorld ( o ) {

    o = o || {};

    if( world !== null ) return;

    isSoft = o.soft === undefined ? false : o.soft;

    solver = new Ammo.btSequentialImpulseConstraintSolver();
    solverSoft = isSoft ? new Ammo.btDefaultSoftBodySolver() : null;
    collision = isSoft ? new Ammo.btSoftBodyRigidBodyCollisionConfiguration() : new Ammo.btDefaultCollisionConfiguration();
    dispatcher = new Ammo.btCollisionDispatcher( collision );

    switch( o.broadphase === undefined ? 2 : o.broadphase ){

        //case 0: broadphase = new Ammo.btSimpleBroadphase(); break;
        case 1: var s = 1000; broadphase = new Ammo.btAxisSweep3( new Ammo.btVector3(-s,-s,-s), new Ammo.btVector3(s,s,s), 4096 ); break;//16384;
        case 2: broadphase = new Ammo.btDbvtBroadphase(); break;
        
    }

    world = isSoft ? new Ammo.btSoftRigidDynamicsWorld( dispatcher, broadphase, solver, collision, solverSoft ) : new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collision );

    
};



function setWater ( o ) {

    if( isSoft ){
        worldInfo = world.getWorldInfo();
        worldInfo.set_water_density( o.density || 0 );
        worldInfo.set_water_offset( o.offset || 0 );
        //worldInfo.set_water_offset( new Ammo.btVector3().fromArray( o.offset || [0,0,0] ) );
        worldInfo.set_water_normal( new Ammo.btVector3().fromArray( o.normal || [0,0,0] ) );
    }

};




//--------------------------------------------------
//
//  AMMO MATH
//
//--------------------------------------------------

var torad = 0.0174532925199432957;
var todeg = 57.295779513082320876;

//--------------------------------------------------
//
//  btTransform extend
//
//--------------------------------------------------

function vectomult( r, s ) {

    //var i = r.length;
    //while(i--) r[i] *= s;
    return [ r[0]*s, r[1]*s, r[2]*s ];

};

function initMath(){


    Ammo.btTransform.prototype.toArray = function( array, offset, s ){

        //if ( offset === undefined ) offset = 0;
        offset = offset || 0;

        this.getOrigin().toArray( array , offset, s );
        this.getRotation().toArray( array , offset + 3 );

        //return array;

    };

    //--------------------------------------------------
    //
    //  btVector3 extend
    //
    //--------------------------------------------------

    Ammo.btVector3.prototype.zero = function( v ){

        this.setValue( 0, 0, 0 );
        return this;

    };

    Ammo.btVector3.prototype.negate = function( v ){

        this.setValue( -this.x(), -this.y(), -this.z() );
        return this;

    };

    Ammo.btVector3.prototype.add = function( v ){

        this.setValue( this.x() + v.x(), this.y() + v.y(), this.z() + v.z() );
        return this;

    };

    Ammo.btVector3.prototype.multiplyScalar = function( s ){

        this.setValue( this.x() * s, this.y() * s, this.z() * s );
        return this;

    };

    Ammo.btVector3.prototype.fromArray = function( array, offset ){

        //if ( offset === undefined ) offset = 0;
        offset = offset || 0;

        this.setValue( array[ offset ], array[ offset + 1 ], array[ offset + 2 ] );

        return this;

    };

    Ammo.btVector3.prototype.toArray = function( array, offset, s ){

        //if ( array === undefined ) array = [];
        //if ( offset === undefined ) offset = 0;
        s = s || 1;
        offset = offset || 0;

        array[ offset ] = this.x() * s;
        array[ offset + 1 ] = this.y() * s;
        array[ offset + 2 ] = this.z() * s;

        //return array;

    };

    Ammo.btVector3.prototype.direction = function( q ){

        // quaternion 
        
        var qx = q.x();
        var qy = q.y();
        var qz = q.z();
        var qw = q.w();

        var x = this.x();
        var y = this.y();
        var z = this.z();

        // calculate quat * vector

        var ix =  qw * x + qy * z - qz * y;
        var iy =  qw * y + qz * x - qx * z;
        var iz =  qw * z + qx * y - qy * x;
        var iw = - qx * x - qy * y - qz * z;

        // calculate result * inverse quat

        var xx = ix * qw + iw * - qx + iy * - qz - iz * - qy;
        var yy = iy * qw + iw * - qy + iz * - qx - ix * - qz;
        var zz = iz * qw + iw * - qz + ix * - qy - iy * - qx;

        this.setValue( xx, yy, zz );

    };

    //--------------------------------------------------
    //
    //  btQuaternion extend
    //
    //--------------------------------------------------

    Ammo.btQuaternion.prototype.fromArray = function( array, offset ){

        //if ( offset === undefined ) offset = 0;
        offset = offset || 0;
        this.setValue( array[ offset ], array[ offset + 1 ], array[ offset + 2 ], array[ offset + 3 ] );

    };

    Ammo.btQuaternion.prototype.toArray = function( array, offset ){

        //if ( array === undefined ) array = [];
        //if ( offset === undefined ) offset = 0;
        offset = offset || 0;

        array[ offset ] = this.x();
        array[ offset + 1 ] = this.y();
        array[ offset + 2 ] = this.z();
        array[ offset + 3 ] = this.w();

        //return array;

    };

    Ammo.btQuaternion.prototype.setFromAxisAngle = function( axis, angle ){

        var halfAngle = angle * 0.5, s = Math.sin( halfAngle );
        this.setValue( axis[0] * s, axis[1] * s, axis[2] * s, Math.cos( halfAngle ) );

    };

    /*Ammo.btTypedConstraint.prototype.getA = function( v ){

        return 1

    };*/


}

//--------------------------------------------------
//
//  AMMO CONSTRAINT JOINT
//
//--------------------------------------------------


/*Ammo.btTypedConstraint.prototype.getA = function( v ){

    return 1

};*/

function stepConstraint ( AR, N ) {

    //if( !joints.length ) return;

    joints.forEach( function ( b, id ) {

        var n = N + (id * 4);

        if( b.type ){

            AR[ n ] = b.type;

        }
        

        

            /*b.getMotionState().getWorldTransform( trans );
            pos = trans.getOrigin();
            quat = trans.getRotation();

            Br[n+1] = pos.x();
            Br[n+2] = pos.y();
            Br[n+3] = pos.z();

            Br[n+4] = quat.x();
            Br[n+5] = quat.y();
            Br[n+6] = quat.z();
            Br[n+7] = quat.w();
            */

        

    });

};

function clearJoint () {

    var j;

    while( joints.length > 0 ){

        j = joints.pop();
        world.removeConstraint( j );
        Ammo.destroy( j );

    }

    joints = [];

};


function addJoint ( o ) {

    //var noAllowCollision = true;
    //var collision = o.collision || false;
    //if( collision ) noAllowCollision = false;

    if(o.body1) o.b1 = o.body1;
    if(o.body2) o.b2 = o.body2;

    var b1 = getByName( o.b1 );
    var b2 = getByName( o.b2 );

    tmpPos1.fromArray( o.pos1 || [0,0,0] ).multiplyScalar(invScale);
    tmpPos2.fromArray( o.pos2 || [0,0,0] ).multiplyScalar(invScale);
    tmpPos3.fromArray( o.axe1 || [1,0,0] );
    tmpPos4.fromArray( o.axe2 || [1,0,0] );

    
    if(o.type !== "joint_p2p" && o.type !== "joint_hinge" && o.type !== "joint" ){

        
        /* 
        // test force local
        var tmpA = new Ammo.btTransform();
        tmpA.setIdentity();
        tmpA.setOrigin( point1 );
        if(o.quatA) tmpA.setRotation( q4( o.quatA ) )

        var frameInA = multiplyTransforms( b1.getWorldTransform(), tmpA );

        var tmpB = new Ammo.btTransform();
        tmpB.setIdentity();
        tmpB.setOrigin( point2 );
        if(o.quatB) tmpB.setRotation( q4( o.quatB ) )

        var frameInB = multiplyTransforms( b2.getWorldTransform(), tmpB );
        */

        // frame A

        tmpTrans1.setIdentity();
        tmpTrans1.setOrigin( tmpPos1 );
        if( o.quatA ){
            tmpQuat.fromArray( o.quatA ); 
            tmpTrans1.setRotation( tmpQuat );
        }
        
        // frame B

        tmpTrans2.setIdentity();
        tmpTrans2.setOrigin( tmpPos2 );
        if( o.quatB ){ 
            tmpQuat.fromArray( o.quatB );
            tmpTrans2.setRotation( tmpQuat );
        }

    }

    // use fixed frame A for linear llimits useLinearReferenceFrameA
    var useA =  o.useA !== undefined ? o.useA : true;

    var joint = null;
    var t = 0;

    switch(o.type){
        case "joint_p2p":
            t = 1;
            joint = new Ammo.btPoint2PointConstraint( b1, b2, tmpPos1, tmpPos2 );
            if(o.strength) joint.get_m_setting().set_m_tau( o.strength );
            if(o.damping) joint.get_m_setting().set_m_damping( o.damping ); 
            if(o.impulse) joint.get_m_setting().set_m_impulseClamp( o.impulse );
        break;
        case "joint_hinge": case "joint": t = 2; joint = new Ammo.btHingeConstraint( b1, b2, tmpPos1, tmpPos2, tmpPos3, tmpPos4, useA ); break;
        case "joint_slider": t = 3; joint = new Ammo.btSliderConstraint( b1, b2, tmpTrans1, tmpTrans2, useA ); break;
        case "joint_conetwist": t = 4; joint = new Ammo.btConeTwistConstraint( b1, b2, tmpTrans1, tmpTrans2 ); break;
        case "joint_dof": t = 5; joint = new Ammo.btGeneric6DofConstraint( b1, b2, tmpTrans1, tmpTrans2, useA );  break;
        case "joint_spring_dof": t = 6; joint = new Ammo.btGeneric6DofSpringConstraint( b1, b2, tmpTrans1, tmpTrans2, useA ); break;
        //case "joint_gear": joint = new Ammo.btGearConstraint( b1, b2, point1, point2, o.ratio || 1); break;
    }

    // EXTRA SETTING

    if(o.breaking) joint.setBreakingImpulseThreshold( o.breaking );

    // hinge

    // limite min, limite max, softness, bias, relaxation
    if(o.limit){ 
        if(o.type === 'joint_hinge' || o.type === 'joint' ) joint.setLimit( o.limit[0]*torad, o.limit[1]*torad, o.limit[2] || 0.9, o.limit[3] || 0.3, o.limit[4] || 1.0 );
        else if(o.type === 'joint_conetwist' ) joint.setLimit( o.limit[0]*torad, o.limit[1]*torad )//, o.limit[2]*torad, o.limit[3] || 0.9, o.limit[4] || 0.3, o.limit[5] || 1.0 );
    }
    if(o.motor) joint.enableAngularMotor( o.motor[0], o.motor[1], o.motor[2] );

//if(o.type==='joint_conetwist') console.log(joint)
    //if(o.type==='joint_hinge') console.log(joint)
    // slider & dof
    if( joint.setLinearLowerLimit ){
        if(o.linLower){ tmpPos.fromArray(o.linLower).multiplyScalar(invScale); joint.setLinearLowerLimit( tmpPos ); }
        if(o.linUpper){ tmpPos.fromArray(o.linUpper).multiplyScalar(invScale); joint.setLinearUpperLimit( tmpPos ); }
    }
    if( joint.setAngularLowerLimit ){
        if(o.angLower){ tmpPos.fromArray(o.angLower); joint.setAngularLowerLimit( tmpPos ); }
        if(o.angUpper){ tmpPos.fromArray(o.angUpper); joint.setAngularUpperLimit( tmpPos ); }
    }

    // dof

    if(o.feedback) joint.enableFeedback( o.feedback );
    if(o.param) joint.setParam( o.param[0], o.param[1], o.param[1] );//BT_CONSTRAINT_STOP_CFM, 1.0e-5f, 5 // add some damping

    
    //if( o.enableSpring && joint.enableSpring ) joint.enableSpring( o.enableSpring[0], o.enableSpring[1] );//0, true
    //if( o.stiffness && joint.setStiffness ) joint.setStiffness( o.stiffness[0], o.stiffness[1] );//0, 39.478 // period 1 sec for !kG body
   // if(o.damping && joint.setDamping ) joint.setDamping( o.damping[0], o.damping[1] );// 0, 0.01 // add some damping
    // constraint force mixing prevents "locking" on limits
    

    if(o.angularOnly) joint.setAngularOnly( o.angularOnly );
    if(o.enableMotor) joint.enableMotor( o.enableMotor );
    if(o.maxMotorImpulse) joint.setMaxMotorImpulse( o.maxMotorImpulse );
    if(o.motorTarget) joint.setMotorTarget( tmpQuat.fromArray( o.motorTarget ) );

    // spring dof
    // < 3 position 
    // > 3 rotation
    if( o.damping && joint.setDamping ){
        for ( var i = 0; i < 6; i++ ) joint.setDamping( i, o.damping[i] );
    }
    if( o.spring && joint.enableSpring ){
        for ( var i = 0; i < 6; i++ ){
            joint.enableSpring( i, o.spring[ i ] === 0 ? false : true );
            joint.setStiffness( i, o.spring[ i ] );
        }
    }

   /* if( joint.enableSpring ){


        if( o.springPosition){
            for ( var i = 0; i < 3; i++ ) {

                joint.enableSpring( i, o.springPosition[ i ] === 0 ? false : true );
                joint.setStiffness( i, o.springPosition[ i ] );

            }
        }

        if(o.springRotation){
            for ( var i = 0; i < 3; i++ ) {

                joint.enableSpring( i + 3, o.springRotation[ i ] === 0 ? false : true );
                joint.setStiffness( i + 3, o.springRotation[ i ] );

            }
        }

    }*/

    // debug test 
    joint.type = 0;
    if( o.debug ){
        joint.type = t
        joint.bodyA = b1;
        joint.bodyB = b2;
    }
    

    var collision = o.collision !== undefined ? o.collision : false;
    world.addConstraint( joint, collision ? false : true );


    if( o.name ) byName[o.name] = joint;

    joints.push( joint );

    //console.log( joint );

    o = null;

};




/**   _   _____ _   _   
*    | | |_   _| |_| |
*    | |_ _| | |  _  |
*    |___|_|_| |_| |_|
*    @author lo.th / https://github.com/lo-th
*    AMMO CONTACT
*/

function stepContact () {

    var i = contactGroups.length;
    while( i-- ) contactGroups[i].step();

};

function clearContact () {

    while( contactGroups.length > 0) contactGroups.pop().clear();
    contactGroups = [];
    contacts = [];

};

function addContact ( o ) {

    var id = contactGroups.length;
    var c = new Contact( o, id );
    if( c.valide ){
        contactGroups.push( c );
        contacts.push(0);
    }

};

//--------------------------------------------------
//
//  CONTACT CLASS
//
//--------------------------------------------------

function Contact ( o, id ) {

    this.a = getByName( o.b1 );
    this.b = o.b2 !== undefined ? getByName( o.b2 ) : null;

    if( this.a !== null ){

        this.id = id;
        this.f = new Ammo.ConcreteContactResultCallback();
        this.f.addSingleResult = function(){ contacts[id] = 1; }
        this.valide = true;

    } else {

        this.valide = false;

    }

}

Contact.prototype = {

    step: function () {

        contacts[ this.id ] = 0;
        if( this.b !== null ) world.contactPairTest( this.a, this.b, this.f );
        else world.contactTest( this.a, this.f );

    },

    clear: function () {

        this.a = null;
        this.b = null;
        Ammo.destroy( this.f );

    }

}

//--------------------------------------------------
//
//  AMMO RIGIDBODY
//
//--------------------------------------------------

function stepRigidBody( AR, N ) {

    //if( !bodys.length ) return;

    bodys.forEach( function ( b, id ) {



        var n = N + (id * 8);
        AR[n] = 0;// b.getLinearVelocity().length() * 9.8;//b.isActive() ? 1 : 0;
        //var ms = b.getMotionState();

        //if ( ms ) {

            b.getMotionState().getWorldTransform( trans );
            trans.toArray( AR, n + 1, worldscale );

        //}

    });

};

function clearRigidBody () {

    var b;
    
    while( bodys.length > 0 ){

        b = bodys.pop();
        world.removeRigidBody( b );
        Ammo.destroy( b );

    }

    while( solids.length > 0 ){

        b = solids.pop();
        //world.removeRigidBody( b );
        world.removeCollisionObject( b );
        Ammo.destroy( b );

    }

    bodys = [];
    solids = [];

};

function removeRigidBody ( name ) {
    
    var b = byName[ name ];

    if( b === undefined ) return;
    if( b === null ) return;

    var n = bodys.indexOf( b );
    if( n !== -1 ) {
        bodys.splice( n, 1 );
        world.removeRigidBody( b );
        Ammo.destroy( b );
    } else {
        n = solids.indexOf( b );
        if( n !== -1 ) {
            solids.splice( n, 1 );
            world.removeCollisionObject( b );
            Ammo.destroy( b );
        }
    }

}

function addRigidBody ( o, extra ) {

    var isKinematic = false;
    
    if( o.density !== undefined ) o.mass = o.density;
    if( o.bounce !== undefined ) o.restitution = o.bounce;

    if( o.kinematic ){ 

        o.flag = 2;
        o.state = 4;
        //o.mass = 0;
        isKinematic = true;

    }

    o.mass = o.mass === undefined ? 0 : o.mass;
    o.size = o.size === undefined ? [1,1,1] : o.size;
    o.pos = o.pos === undefined ? [0,0,0] : o.pos;
    o.quat = o.quat === undefined ? [0,0,0,1] : o.quat;

    if( worldscale !== 1 ) {
        o.pos = vectomult( o.pos, invScale );
        o.size = vectomult( o.size, invScale );
    }

    var shape = null;
    switch( o.type ){

        case 'plane': 
            tmpPos4.fromArray( o.dir || [0,1,0] ); 
            shape = new Ammo.btStaticPlaneShape( tmpPos4, 0 );
        break;

        case 'box': 
            tmpPos4.setValue( o.size[0]*0.5, o.size[1]*0.5, o.size[2]*0.5 );  
            shape = new Ammo.btBoxShape( tmpPos4 );
        break;

        case 'sphere': 
            shape = new Ammo.btSphereShape( o.size[0] ); 
        break;  

        case 'cylinder': 
            tmpPos4.setValue( o.size[0], o.size[1]*0.5, o.size[2]*0.5 );
            shape = new Ammo.btCylinderShape( tmpPos4 );
        break;

        case 'cone': 
            shape = new Ammo.btConeShape( o.size[0], o.size[1]*0.5 );
        break;

        case 'capsule': 
            shape = new Ammo.btCapsuleShape( o.size[0], o.size[1]*0.5 ); 
        break;
        
        case 'compound': 
            shape = new Ammo.btCompoundShape(); 
        break;

        case 'mesh':
            var mTriMesh = new Ammo.btTriangleMesh();
            var removeDuplicateVertices = true;
            var vx = o.v;
            for (var i = 0, fMax = vx.length; i < fMax; i+=9){
                tmpPos1.setValue( vx[i+0]*o.size[0], vx[i+1]*o.size[1], vx[i+2]*o.size[2] );
                tmpPos2.setValue( vx[i+3]*o.size[0], vx[i+4]*o.size[1], vx[i+5]*o.size[2] );
                tmpPos3.setValue( vx[i+6]*o.size[0], vx[i+7]*o.size[1], vx[i+8]*o.size[2] );
                mTriMesh.addTriangle( tmpPos1, tmpPos2, tmpPos3, removeDuplicateVertices );
            }
            if(o.mass == 0){ 
                // btScaledBvhTriangleMeshShape -- if scaled instances
                shape = new Ammo.btBvhTriangleMeshShape( mTriMesh, true, true );
            }else{ 
                // btGimpactTriangleMeshShape -- complex?
                // btConvexHullShape -- possibly better?
                shape = new Ammo.btConvexTriangleMeshShape( mTriMesh, true );
            }
        break;

        case 'convex':
            shape = new Ammo.btConvexHullShape();
            var vx = o.v;
            for (var i = 0, fMax = vx.length; i < fMax; i+=3){
                vx[i]*=o.size[0];
                vx[i+1]*=o.size[1];
                vx[i+2]*=o.size[2];

                tmpPos1.fromArray( vx , i );
                shape.addPoint( tmpPos1 );
            };
        break;
    }

    if( o.margin !== undefined && shape.setMargin !== undefined ) shape.setMargin( o.margin );

    if( extra == 'isShape' ) return shape;
    
    if( extra == 'isGhost' ){ 
        var ghost = new Ammo.btGhostObject();
        ghost.setCollisionShape( shape );
        ghost.setCollisionFlags( o.flag || 1 ); 
        //o.f = new Ammo.btGhostPairCallback();
        //world.getPairCache().setInternalGhostPairCallback( o.f );
        return ghost;
    }

    /*
    var quat = new Ammo.btQuaternion();
    quat.fromArray( o.quat );
    var pos = new Ammo.btVector3();
    pos.fromArray( o.pos );
    var pos1 = new Ammo.btVector3();
    pos1.setValue( 0,0,0 );
    var transs = new Ammo.btTransform();
    transs.setIdentity();
    transs.setOrigin( pos );
    transs.setRotation( quat );

    //console.log(o)

    if( o.mass !== 0 ) shape.calculateLocalInertia( o.mass, pos1 );
    var motionState = new Ammo.btDefaultMotionState( transs );
    var rbInfo = new Ammo.btRigidBodyConstructionInfo( o.mass, motionState, shape, pos1 );
    */
     
    tmpPos.fromArray( o.pos );
    tmpQuat.fromArray( o.quat );

    tmpTrans.setIdentity();
    tmpTrans.setOrigin( tmpPos );
    tmpTrans.setRotation( tmpQuat );
    tmpPos1.setValue( 0,0,0 );

    if( o.mass !== 0 ) shape.calculateLocalInertia( o.mass, tmpPos1 );
    var motionState = new Ammo.btDefaultMotionState( tmpTrans );
    var rbInfo = new Ammo.btRigidBodyConstructionInfo( o.mass, motionState, shape, tmpPos1 );
   

    if( o.friction !== undefined ) rbInfo.set_m_friction( o.friction );//0.5
    if( o.restitution !== undefined ) rbInfo.set_m_restitution( o.restitution );//0
    //Damping is the proportion of velocity lost per second.
    if( o.linear !== undefined ) rbInfo.set_m_linearDamping( o.linear );//0
    if( o.angular !== undefined ) rbInfo.set_m_angularDamping( o.angular );//0
    // prevents rounded shapes, such as spheres, cylinders and capsules from rolling forever.
    if( o.rolling !== undefined ) rbInfo.set_m_rollingFriction( o.rolling );//0



    
    var body = new Ammo.btRigidBody( rbInfo );
    body.isKinematic = isKinematic;

    if( o.name ){  byName[ o.name ] = body;  }
    else if ( o.mass !== 0 ) byName[ bodys.length ] = body;

    //if( o.positionDamping !== undefined && o.rotationDamping !== undefined ) body.setDamping( o.positionDamping, o.rotationDamping );

    if ( o.mass === 0 && !isKinematic ){ // static

        body.setCollisionFlags( o.flag || 1 ); 
        world.addCollisionObject( body, o.group || 1, o.mask || -1 );
        solids.push( body );

    } else { // dynamic or kinematic

       // body.isKinematic = isKinematic;
        body.setCollisionFlags( o.flag || 0 );
        body.setActivationState( o.state || 1 );

        if( o.neverSleep ) body.setSleepingThresholds( 0, 0 );
       // if( isKinematic ){ 
            //0.8, 1.0
            //body.setCenterOfMassTransform( worldTrans );
            //body.setCenterOfMassTransform( tmpTrans );
            //body.getMotionState().setWorldTransform( tmpTrans );
      //  }

        world.addRigidBody( body, o.group || 1, o.mask || -1 );





        /*var n = bodys.length;
        tmpPos.toArray( Br, n + 1 );
        tmpQuat.toArray( Br, n + 4 );*/

        //body.activate();
        /*
        AMMO.ACTIVE = 1;
        AMMO.ISLAND_SLEEPING = 2;
        AMMO.WANTS_DEACTIVATION = 3;
        AMMO.DISABLE_DEACTIVATION = 4;
        AMMO.DISABLE_SIMULATION = 5;
        */
        
        bodys.push( body );

        //console.log( body )
        
    }
    
    //console.log(body)
    

    //if ( o.mass === 0  && !isKinematic) solids.push( body );
    //else bodys.push( body );


    //console.log(body)

    //Ammo.destroy( startTransform );
    //Ammo.destroy( localInertia );
    Ammo.destroy( rbInfo );



    o = null;

};
