addi $t0, $zero, 32
addi $t1, $zero, 69
lea $at, subroutine

! begin fake jalr
lea $ra, 18         ! store return address
sw $t0, -3($ra)     ! back up $t0
sw $t1, -2($ra)     ! back up $t1
addi $t0, $ra, -3   ! get effective pc for beq below
nand $t0, $t0, $t0  ! $t0 <- ~pc
addi $t0, $t0, 1    ! $t0 <- -pc
add $t0, $t0, $at   ! $t0 <- offset = $at - pc
lw $t1, -1($ra)     ! $t1 <- 0xfffff
nand $t0, $t0, $t1  ! $t0 <- ~(($at - pc) & 0xfffff)
nand $t0, $t0, $t0  ! $t0 <- ($at - pc) & 0xfffff
lw $t1, -4($ra)     ! $t1 <- 0x50000000
add $t0, $t1, $t0   ! $t0 <- 0x50000000 + offset
sw $t0, -4($ra)     ! make beq below go to $at (*)
lw $t0, -3($ra)     ! restore $t0
lw $t1, -2($ra)     ! restore $t1
beq $zero, $zero, 0 ! branch to $at once changed by (*) above
.word 0             ! place to back up $t0
.word 0             ! place to back up $t1
.word 0xfffff       ! mask to deal with negative offsets
! end fake jalr

add $t0, $t0, $v0 ! rest of the code
halt

subroutine:
addi $v0, $zero, 420
add $at, $zero, $ra ! $at <- ra

! begin fake jalr
lea $ra, 18         ! store return address
sw $t0, -3($ra)     ! back up $t0
sw $t1, -2($ra)     ! back up $t1
addi $t0, $ra, -3   ! get effective pc for beq below
nand $t0, $t0, $t0  ! $t0 <- ~pc
addi $t0, $t0, 1    ! $t0 <- -pc
add $t0, $t0, $at   ! $t0 <- offset = $at - pc
lw $t1, -1($ra)     ! $t1 <- 0xfffff
nand $t0, $t0, $t1  ! $t0 <- ~(($at - pc) & 0xfffff)
nand $t0, $t0, $t0  ! $t0 <- ($at - pc) & 0xfffff
lw $t1, -4($ra)     ! $t1 <- 0x50000000
add $t0, $t1, $t0   ! $t0 <- 0x50000000 + offset
sw $t0, -4($ra)     ! make beq below go to $at (*)
lw $t0, -3($ra)     ! restore $t0
lw $t1, -2($ra)     ! restore $t1
beq $zero, $zero, 0 ! branch to $at once changed by (*) above
.word 0             ! place to back up $t0
.word 0             ! place to back up $t1
.word 0xfffff       ! mask to deal with negative offsets
! end fake jalr
