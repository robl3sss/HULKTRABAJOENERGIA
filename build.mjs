import {cp,mkdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of ['index.html','css','js','assets'])await cp(file,`dist/${file}`,{recursive:true});
console.log('HULK TRABAJO Y ENERGÍA: static build ready in dist/');
