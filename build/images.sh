#!/usr/bin/env bash
# Every image the deck uses, cut from the original slides and treated (see treat-images.sh).
set -euo pipefail
cd "$(dirname "$0")"
T=./treat-images.sh
CONTRAST=0.8 $T panel image1.jpg  682x685+459+0   hal-1972
            $T panel image3.jpg  1027x685+286+0  caltech
DIM=72 $T panel image4.jpg  479x684+560+1   feller 8
            $T panel image5.jpg  800x535+400+75  hal-and-fran
            $T panel image6.jpg  576x355+512+162 intellivision
DIM=72 $T panel image8.jpg  524x685+538+0   chaum-dissertation 8
DIM=72 $T panel image9.jpg  496x685+552+0   blind-signatures 8
DIM=72 $T panel image11.jpg 440x684+580+0   dwork-naor 8
CONTRAST=1.5 $T panel image12.jpg 525x685+537+0  wired-1993 5
DIM=72 $T panel image17.jpg 581x685+509+0   b-money 8
            $T circle image7.jpg  540x540+770+0   chaum
            $T circle image10.jpg 300x300+690+137 zimmermann
            $T circle image14.jpg 220x220+690+228 back
            $T circle image18.jpg 192x192+704+246 szabo
            $T circle image19.jpg 420x420+591+122 sassaman
