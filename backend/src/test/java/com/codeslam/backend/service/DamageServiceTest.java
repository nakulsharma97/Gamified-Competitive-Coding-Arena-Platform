package com.codeslam.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.codeslam.backend.dto.DamageResult;
import com.codeslam.backend.enums.Verdict;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class DamageServiceTest {

    private final DamageService damageService = new DamageService();

    @Test
    void acAloneDealsTwentyDamage() {
        DamageResult result = damageService.calculateDamage(Verdict.AC, 100, 32.0, null, null, false, List.of());

        assertEquals(18, result.getDamageDealt());
        assertEquals(0, result.getSelfDamage());
        assertEquals(List.of("Correct solution +18"), result.getBreakdown());
    }

    @Test
    void acWithFirstAcDealsThirtyFiveDamage() {
        DamageResult result = damageService.calculateDamage(Verdict.AC, 100, 32.0, null, null, true, List.of());

        assertEquals(33, result.getDamageDealt());
        assertEquals(0, result.getSelfDamage());
        assertEquals(List.of("Correct solution +18", "First AC bonus +15"), result.getBreakdown());
    }

    @Test
    void acWithFirstAcFasterAndLessMemoryDealsFiftyFiveDamage() {
        DamageResult result = damageService.calculateDamage(Verdict.AC, 90, 28.0, 100, 32.0, true, List.of());

        assertEquals(37, result.getDamageDealt());
        assertEquals(0, result.getSelfDamage());
        assertEquals(
                List.of(
                        "Correct solution +18",
                        "First AC bonus +15",
                        "Runtime advantage +2",
                        "Memory advantage +2"),
                result.getBreakdown());
    }

    @ParameterizedTest
    @CsvSource({ "TLE", "MLE", "RE", "ERROR", "PENDING" })
    void nonAcVerdictsDoNotDealDamage(Verdict verdict) {
        DamageResult result = damageService.calculateDamage(verdict, 100, 32.0, 50, 16.0, false, List.of());

        assertEquals(0, result.getDamageDealt());
        assertEquals(0, result.getSelfDamage());
        assertEquals(List.of(), result.getBreakdown());
    }

    @Test
    void waCausesTenSelfDamage() {
        DamageResult result = damageService.calculateDamage(Verdict.WA, 100, 32.0, 50, 16.0, false, List.of());

        assertEquals(0, result.getDamageDealt());
        assertEquals(10, result.getSelfDamage());
        assertEquals(List.of("Wrong answer self-damage +10"), result.getBreakdown());
    }

    @ParameterizedTest
    @CsvSource({
            "null,100,18",
            "100,100,18",
            "120,100,21"
    })
    void runtimeComparisonOnlyAddsBonusWhenPlayerIsFaster(String opponentRuntime, int runtimeMs, int expectedDamage) {
        Integer parsedOpponentRuntime = "null".equals(opponentRuntime) ? null : Integer.valueOf(opponentRuntime);
        DamageResult result = damageService.calculateDamage(Verdict.AC, runtimeMs, 32.0, parsedOpponentRuntime, 16.0,
                false, List.of());

        assertEquals(expectedDamage, result.getDamageDealt());
    }

    @ParameterizedTest
    @CsvSource({
            "null,16.0,18",
            "16.0,16.0,18",
            "12.0,16.0,21"
    })
    void memoryComparisonOnlyAddsBonusWhenPlayerUsesLessMemory(String playerMemory, double opponentMemory,
            int expectedDamage) {
        double parsedPlayerMemory = "null".equals(playerMemory) ? 32.0 : Double.parseDouble(playerMemory);
        DamageResult result = damageService.calculateDamage(Verdict.AC, 100, parsedPlayerMemory, 100, opponentMemory,
                false, List.of());

        assertEquals(expectedDamage, result.getDamageDealt());
    }

    @Test
    void compatibilityCalculateMethodStillReturnsExpectedDamage() {
        DamageResult result = damageService.calculate(Verdict.AC, 100, 16.0, 100, 16.0, false, 3);

        assertEquals(18, result.getDamageDealt());
        assertEquals(0, result.getSelfDamage());
    }

    @Test
    void compatibilityCalculateMethodStillReturnsExpectedSelfDamage() {
        DamageResult result = damageService.calculate(Verdict.WA, 100, 16.0, 100, 16.0, false, 3);

        assertEquals(0, result.getDamageDealt());
        assertEquals(10, result.getSelfDamage());
    }
}
