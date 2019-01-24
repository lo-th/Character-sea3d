/**   _  _____ _   _   
*    | ||_   _| |_| |
*    | |_ | | |  _  |
*    |___||_| |_| |_|
*    @author lo.th / https://github.com/lo-th
*
* Description: add reference skeleton and scalling
*
*/

//-----------------------
// skeleton referency
//-----------------------

THREE.Skeleton.prototype.setReference = function ( ref ) {

    this.reference_skeleton = ref;

    var bone, name;

    for ( var i = 0, il = this.bones.length; i < il; i ++ ) {

        bone = this.bones[i];
        name = bone.name;

        bone.userData.idr = -1;

        for ( var j = 0, jl = ref.bones.length; j < jl; j ++ ) {

            if( name === ref.bones[j].name ){ 

            	bone.userData.idr = j;

            }

        }

    }

}

//-----------------------
// force local scalling
//-----------------------

THREE.Skeleton.prototype.update = ( function () {

    var offsetMatrix = new THREE.Matrix4();
    var identityMatrix = new THREE.Matrix4();

    var mtx = new THREE.Matrix4();
    var tmtx = new THREE.Matrix4();

    var p = new THREE.Vector3();
    var s = new THREE.Vector3();
    var q = new THREE.Quaternion();
    var q2 = new THREE.Quaternion();

    return function update() {

        var bones = this.bones;
        var boneInverses = this.boneInverses;
        var boneMatrices = this.boneMatrices;
        var boneTexture = this.boneTexture;

        var m, bone;

        // flatten bone matrices to array

        for ( var i = 0, il = bones.length; i < il; i ++ ) {

            bone = bones[ i ];

            // compute the offset between the current and the original transform

            var matrix = bone ? bone.matrixWorld : identityMatrix;

             

            // reference skeleton update

            if( this.reference_skeleton && bone.userData.idr !==-1 ){ 

                matrix = this.reference_skeleton.bones[ bone.userData.idr ].matrixWorld;

            }

            // physical mesh update
            
            if( bone.userData.isPhysics ){

                m = bone.userData.mesh;

                if( bone.userData.isKinematic ){

                    mtx
                    .multiplyMatrices( bone.matrixWorld, m.userData.decal )
                    .decompose( p, q, s );

                    m.userData.matrix = [ m.name, p.toArray(), q.toArray() ];

                } else {

                    mtx
                    .copy( m.matrixWorld )
                    .decompose( p, q, s )
                    .compose( p, q, s.set( 1, 1, 1 ) )
                    .multiply( m.userData.decal );

                    matrix.copy( mtx );

                    if ( bone.parent && bone.parent.isBone ) {

						bone.matrix.getInverse( bone.parent.matrixWorld );
						bone.matrix.multiply( mtx );

					} else {

						bone.matrix.copy( mtx );

					}


                    bone.matrix.decompose( bone.position, bone.quaternion, bone.scale );
                    
                }

            }


            // bones scalling

            if( bone.scalling !== undefined  ){

                matrix.scale( bone.scalling );

                for ( var j = 0, jl = bones[ i ].children.length; j < jl; j ++ ) {

                    mtx.multiplyMatrices( matrix, bone.children[ j ].matrix );
                    mtx.decompose( p, q, s );
                    bone.children[ j ].matrixWorld.setPosition( p );

                }

            }

            // default
          
            offsetMatrix.multiplyMatrices( matrix, boneInverses[ i ] );
            offsetMatrix.toArray( boneMatrices, i * 16 );
            
        }

        if ( boneTexture !== undefined ) {

            boneTexture.needsUpdate = true;

        }

    };

})();