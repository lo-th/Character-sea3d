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

            if( !ref.bones[j].userData.phyMtx ){ 
                ref.bones[j].userData.isPhysics = false;
                ref.bones[j].userData.phyMtx = new THREE.Matrix4();
            }


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

    return function update() {

        var bones = this.bones;
        var boneInverses = this.boneInverses;
        var boneMatrices = this.boneMatrices;
        var boneTexture = this.boneTexture;

        var m, bone, rBone, needup, matrix;

        // flatten bone matrices to array

        for ( var i = 0, il = bones.length; i < il; i ++ ) {

            bone = bones[ i ];

            // compute the offset between the current and the original transform

            //var matrix = bone ? bone.matrixWorld : identityMatrix;

            // reference skeleton update

            if( this.reference_skeleton && bone.userData.idr !==-1 ){

                rBone = this.reference_skeleton.bones[ bone.userData.idr ];
                matrix = rBone.userData.isPhysics ? rBone.userData.phyMtx : rBone.matrixWorld;

                //this.fill( boneMatrices, i * 16, this.reference_skeleton.boneMatrices, bone.userData.idr * 16 );

            } else {

                matrix = bone ? bone.matrixWorld : identityMatrix;

            }

            // bones scalling

            if( bone.scalling !== undefined ){

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