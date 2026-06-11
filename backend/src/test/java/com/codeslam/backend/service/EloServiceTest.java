package com.codeslam.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.codeslam.backend.enums.RankTier;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class EloServiceTest {

    private final EloService eloService = new EloService();

    @ParameterizedTest
    @CsvSource({
            "1200,1200,true,1216",
            "1500,1500,true,1512",
            "1900,1900,true,1908",
            "2300,2300,true,2306",
            "1200,1200,false,1184",
            "1500,1500,false,1488",
            "1900,1900,false,1892",
            "2300,2300,false,2294"
    })
    void calculateNewEloAppliesTierSpecificKFactors(int playerElo, int opponentElo, boolean won, int expectedElo) {
        assertEquals(expectedElo, eloService.calculateNewElo(playerElo, opponentElo, won));
    }

    @ParameterizedTest
    @CsvSource({
            "999,BRONZE",
            "1000,SILVER",
            "1399,SILVER",
            "1400,GOLD",
            "1799,GOLD",
            "1800,DIAMOND",
            "2199,DIAMOND",
            "2200,GRANDMASTER"
    })
    void getRankTierHonorsBoundaryEloValues(int elo, RankTier expectedTier) {
        assertEquals(expectedTier, eloService.getRankTier(elo));
    }

    @ParameterizedTest
    @CsvSource({
            "1400,III",
            "1532,III",
            "1533,II",
            "1665,II",
            "1666,I",
            "1799,I"
    })
    void getSubTierSplitsGoldIntoThirds(int elo, String expectedSubTier) {
        assertEquals(expectedSubTier, eloService.getSubTier(elo));
    }

    @ParameterizedTest
    @CsvSource({
            "999,1000,BRONZE,SILVER,true",
            "1799,1800,GOLD,DIAMOND,true",
            "1000,999,SILVER,BRONZE,false",
            "1500,1600,SILVER,SILVER,false"
    })
    void detectRankChangeReportsBoundaryCrossings(int oldElo, int newElo, RankTier from, RankTier to,
            boolean promotion) {
        Optional<EloService.RankChangeEvent> event = eloService.detectRankChange(oldElo, newElo);

        if (from == to) {
            assertTrue(event.isEmpty());
            return;
        }

        assertTrue(event.isPresent());
        assertEquals(from, event.orElseThrow().from());
        assertEquals(to, event.orElseThrow().to());
        assertEquals(promotion, event.orElseThrow().isPromotion());
    }

    @ParameterizedTest
    @CsvSource({
            "1600,true,1612",
            "1600,false,1588"
    })
    void equalEloPlayersMoveSymmetrically(int playerElo, boolean won, int expectedElo) {
        assertEquals(expectedElo, eloService.calculateNewElo(playerElo, playerElo, won));
    }

    @ParameterizedTest
    @CsvSource({
            "1200,1200,1216",
            "1500,1500,1512",
            "1900,1900,1908",
            "2300,2300,2306"
    })
    void calculateNewEloMatchesExpectedKFactorByTier(int playerElo, int opponentElo, int expectedElo) {
        assertEquals(expectedElo, eloService.calculateNewElo(playerElo, opponentElo, true));
    }

    @Test
    void detectRankChangeReturnsEmptyInsideTheSameTier() {
        assertTrue(eloService.detectRankChange(1500, 1600).isEmpty());
    }

    @Test
    void rankChangePromotionFlagIsFalseForDemotion() {
        Optional<EloService.RankChangeEvent> event = eloService.detectRankChange(1000, 999);

        assertTrue(event.isPresent());
        assertFalse(event.orElseThrow().isPromotion());
    }
}