.orig x3000

ld r0, bang
and r2, r2, 0
add r2, r2, 3

; amazing loop
loop brnz done
out
add r2, r2, -1
br loop

done halt

bang .fill '!'

.end
