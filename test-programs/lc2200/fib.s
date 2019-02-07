!============================================================
! CS 2200 Homework 2
! Austin Adams
!
! Please do not change main's functionality,
! except to change the argument for fibonacci or to meet your
! calling convention
!============================================================

main:
    la      $sp, stack          ! load ADDRESS of stack label into $sp
    lw      $sp, 0 ($sp)        ! load 0x4000, the address of the stack, into $sp

    addi    $a0, $zero, 5       ! $a0 = 5, the number n to compute fibonacci(n)
    addi    $sp, $sp, -1        ! allocate stack space for old $ra
    sw      $ra, 0 ($sp)        ! back up old return address
    la      $at, fibonacci      ! load address of factorial label into $at
    jalr    $at, $ra            ! jump to factorial, set $ra to return addr
    lw      $ra, 0 ($sp)        ! restore old $ra
    addi    $sp, $sp, 1         ! free old $ra space from stack
    halt                        ! when we return, just halt

fibonacci:
    ! setup
    addi    $sp, $sp, -1        ! allocate stack space for old frame pointer
    sw      $fp, 0 ($sp)        ! store old frame pointer at top of stack
    addi    $fp, $sp, 0         ! set the frame pointer
    addi    $sp, $sp, -1        ! allocate stack space for $s0
    sw      $s0, 0 ($sp)        ! push $s0 onto the stack
    addi    $sp, $sp, -1        ! allocate stack space for local var 0

    ! base cases
    beq     $a0, $zero, fib_basecase_mid ! base case: if n == 0, return 0
    addi    $t0, $zero, 1            ! t0 ← 1
    beq     $a0, $t0, fib_basecase_mid   ! base case: if n == 1, return 1

    addi    $s0, $zero, 0       ! s0 ← 0
    sw      $a0, -2 ($fp)       ! back up n at local var 0

    ! fib(n-1)
    addi    $a0, $a0, -1        ! calculate the n-1
    ! caller setup
    addi    $sp, $sp, -1        ! allocate stack space for old $ra
    sw      $ra, 0 ($sp)        ! back up return address
    ! recurse
    la      $at, fibonacci      ! load address of factorial label into $at
    jalr    $at, $ra            ! jump to factorial, set $ra to return addr
    ! caller teardown
    lw      $ra, 0 ($sp)        ! restore return address
    addi    $sp, $sp, 1         ! pop of unused stack space from $ra

    beq     $zero, $zero, fib_continue
    fib_basecase_mid:
    beq     $zero, $zero, fib_basecase
    fib_continue:

    add     $s0, $s0, $v0       ! s0 += fibonacci(n - 1)

    ! fib(n-2)
    lw      $a0, -2 ($fp)       ! restore n from local var 0
    addi    $a0, $a0, -2        ! calculate n-2
    ! caller setup
    addi    $sp, $sp, -1        ! allocate stack space for old $ra
    sw      $ra, 0 ($sp)        ! back up return address
    ! recurse
    la      $at, fibonacci      ! load address of factorial label into $at
    jalr    $at, $ra            ! jump to factorial, set $ra to return addr
    ! caller teardown
    lw      $ra, 0 ($sp)        ! restore return address
    addi    $sp, $sp, 1         ! pop of unused stack space from $ra

    ! prep for teardown
    return:
    add     $v0, $s0, $v0       ! return fib(n-1) + fib(n-2)
    beq     $zero, $zero, fib_teardown ! return

    fib_basecase:
    addi    $v0, $a0, 0         ! v0 ← a0

    fib_teardown:
    addi    $sp, $sp, 1         ! pop local variable 0 off stack
    lw      $s0, 0 ($sp)        ! restore $s0
    addi    $sp, $sp, 1         ! pop $s0 off stack
    lw      $fp, 0 ($sp)        ! restore old frame pointer
    addi    $sp, $sp, 1         ! pop old $fp off stack
    jalr    $ra, $zero          ! return, discarding the PC

stack: .word 0x4000             ! the stack begins here (for example, that is)
