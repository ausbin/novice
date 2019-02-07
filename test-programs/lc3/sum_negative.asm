;;====================================
;; CS 2110 - Fall 2018
;; Homework 6
;;====================================
;; Name:
;;====================================

.orig x3000

  LD R0, ARRAY_ADDR   ;; array
  LD R1, ARRAY_LEN    ;; length

  AND R2, R2, #0      ;; i
  AND R3, R3, #0      ;; sum

FOR_LOOP
  NOT R4, R1          ;;       ! length
  ADD R4, R4, #1      ;;       - length
  ADD R4, R2, R4      ;;     i - length
  BRZP DONE           ;; if (i - length >= 0) break;

  ADD R4, R0, R2      ;;     array + i
  LDR R4, R4, #0      ;;     array[i]

  BRZP NONNEG         ;; if (array[i] < 0)
  ADD R3, R3, R4      ;;   sum += array[i]

NONNEG
  ADD R2, R2, #1      ;; i++
  BR FOR_LOOP

DONE
  ST R3, ANSWER
  HALT

ARRAY_ADDR .fill x4000
ARRAY_LEN  .fill 10

ANSWER     .blkw 1

.end

.orig x4000
  .fill 7
  .fill -18
  .fill 0
  .fill 5
  .fill -9
  .fill 25
  .fill 1
  .fill -2
  .fill 10
  .fill -6
.end
