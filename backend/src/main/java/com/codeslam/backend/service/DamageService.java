package com.codeslam.backend.service;

import com.codeslam.backend.dto.DamageResult;
import com.codeslam.backend.enums.Verdict;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DamageService {

    public DamageResult calculate(
            Verdict myVerdict,
            Integer myRuntimeMs,
            Double myMemoryMb,
            Integer opponentLastRuntimeMs,
            Double opponentLastMemoryMb,
            boolean isFirstAc,
            int powerUpsApplied) {
        return calculate(
                myVerdict,
                myRuntimeMs,
                myMemoryMb,
                opponentLastRuntimeMs,
                opponentLastMemoryMb,
                isFirstAc,
                0,
                powerUpsApplied);
    }

    public DamageResult calculate(
            Verdict myVerdict,
            Integer myRuntimeMs,
            Double myMemoryMb,
            Integer opponentLastRuntimeMs,
            Double opponentLastMemoryMb,
            boolean isFirstAc,
            int comboStreak,
            int powerUpsApplied) {
        return calculateDamage(
                myVerdict,
                myRuntimeMs == null ? 0 : myRuntimeMs,
                myMemoryMb == null ? 0.0d : myMemoryMb,
                opponentLastRuntimeMs,
                opponentLastMemoryMb,
                isFirstAc,
                comboStreak,
                Collections.nCopies(Math.max(0, powerUpsApplied), Boolean.TRUE));
    }

    public DamageResult calculateDamage(
            Verdict myVerdict,
            int myRuntimeMs,
            double myMemoryMb,
            Integer opponentLastRuntimeMs,
            Double opponentLastMemoryMb,
            boolean isFirstAc,
            List<?> powerUpsApplied) {
        return calculateDamage(
                myVerdict,
                myRuntimeMs,
                myMemoryMb,
                opponentLastRuntimeMs,
                opponentLastMemoryMb,
                isFirstAc,
                0,
                powerUpsApplied);
    }

    public DamageResult calculateDamage(
            Verdict myVerdict,
            int myRuntimeMs,
            double myMemoryMb,
            Integer opponentLastRuntimeMs,
            Double opponentLastMemoryMb,
            boolean isFirstAc,
            int comboStreak,
            List<?> powerUpsApplied) {

        List<String> breakdown = new ArrayList<>();
        int damageDealt = 0;
        int selfDamage = 0;

        if (myVerdict == Verdict.AC) {
            damageDealt += 18;
            breakdown.add("Correct solution +18");

            if (isFirstAc) {
                damageDealt += 15;
                breakdown.add("First AC bonus +15");
            }

            int runtimeBonus = performanceBonus(myRuntimeMs, opponentLastRuntimeMs, 16);
            if (runtimeBonus > 0) {
                damageDealt += runtimeBonus;
                breakdown.add("Runtime advantage +" + runtimeBonus);
            }

            int memoryBonus = performanceBonus(myMemoryMb, opponentLastMemoryMb, 12);
            if (memoryBonus > 0) {
                damageDealt += memoryBonus;
                breakdown.add("Memory advantage +" + memoryBonus);
            }

            int normalizedComboStreak = Math.max(0, comboStreak);
            if (normalizedComboStreak > 1) {
                int comboBonus = Math.min(20, (normalizedComboStreak - 1) * 4);
                if (comboBonus > 0) {
                    damageDealt += comboBonus;
                    breakdown.add("Combo streak x" + normalizedComboStreak + " +" + comboBonus);
                }
            }
        } else if (myVerdict == Verdict.WA) {
            selfDamage += 10;
            breakdown.add("Wrong answer self-damage +10");
        }

        damageDealt = Math.min(80, Math.max(0, damageDealt));

        return DamageResult.builder()
                .damageDealt(damageDealt)
                .selfDamage(selfDamage)
                .breakdown(breakdown)
                .build();
    }

    private int performanceBonus(int myValue, Integer opponentValue, int maxBonus) {
        if (opponentValue == null || opponentValue <= 0 || myValue <= 0 || myValue >= opponentValue) {
            return 0;
        }

        double improvementRatio = ((double) opponentValue - myValue) / opponentValue;
        return Math.min(maxBonus, Math.max(1, (int) Math.round(improvementRatio * maxBonus)));
    }

    private int performanceBonus(double myValue, Double opponentValue, int maxBonus) {
        if (opponentValue == null || opponentValue <= 0.0d || myValue <= 0.0d || myValue >= opponentValue) {
            return 0;
        }

        double improvementRatio = (opponentValue - myValue) / opponentValue;
        return Math.min(maxBonus, Math.max(1, (int) Math.round(improvementRatio * maxBonus)));
    }
}