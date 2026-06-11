package com.codeslam.backend.service;

import com.codeslam.backend.dto.TierChangeResult;
import com.codeslam.backend.enums.Rank;
import com.codeslam.backend.enums.RankTier;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class EloService {

    public int calculateNewElo(int playerElo, int opponentElo, boolean won) {
        return calculateNewElo(playerElo, opponentElo, won ? 1.0 : 0.0);
    }

    public int calculateNewElo(int playerElo, int opponentElo, double result) {
        int kFactor = getKFactor(playerElo);
        double expectedScore = 1.0 / (1.0 + Math.pow(10.0, (opponentElo - playerElo) / 400.0));
        return Math.max(0, (int) Math.round(playerElo + kFactor * (result - expectedScore)));
    }

    public RankTier getRankTier(int elo) {
        if (elo >= 2200) {
            return RankTier.GRANDMASTER;
        }
        if (elo >= 1800) {
            return RankTier.DIAMOND;
        }
        if (elo >= 1400) {
            return RankTier.GOLD;
        }
        if (elo >= 1000) {
            return RankTier.SILVER;
        }
        return RankTier.BRONZE;
    }

    public String getSubTier(int elo) {
        RankTier tier = getRankTier(elo);
        int min = tierMin(tier);
        int max = tierMax(tier);
        int rangeSize = max - min + 1;
        int third = rangeSize / 3;
        int offset = Math.max(0, Math.min(elo - min, rangeSize - 1));

        if (offset < third) {
            return "III";
        }
        if (offset < third * 2) {
            return "II";
        }
        return "I";
    }

    public Optional<RankChangeEvent> detectRankChange(int oldElo, int newElo) {
        RankTier from = getRankTier(oldElo);
        RankTier to = getRankTier(newElo);
        if (from == to) {
            return Optional.empty();
        }
        return Optional.of(new RankChangeEvent(from, to, to.ordinal() > from.ordinal()));
    }

    public Rank getTier(int elo) {
        return Rank.valueOf(getRankTier(elo).name());
    }

    public TierChangeResult detectTierChange(int oldElo, int newElo) {
        Rank oldTier = getTier(oldElo);
        Rank newTier = getTier(newElo);
        return TierChangeResult.builder()
                .oldTier(oldTier)
                .newTier(newTier)
                .changed(oldTier != newTier)
                .build();
    }

    private int getKFactor(int elo) {
        if (elo < 1400) {
            return 32;
        }
        if (elo < 1800) {
            return 24;
        }
        if (elo < 2200) {
            return 16;
        }
        return 12;
    }

    private int tierMin(RankTier tier) {
        return switch (tier) {
            case BRONZE -> 0;
            case SILVER -> 1000;
            case GOLD -> 1400;
            case DIAMOND -> 1800;
            case GRANDMASTER -> 2200;
        };
    }

    private int tierMax(RankTier tier) {
        return switch (tier) {
            case BRONZE -> 999;
            case SILVER -> 1399;
            case GOLD -> 1799;
            case DIAMOND -> 2199;
            case GRANDMASTER -> Integer.MAX_VALUE;
        };
    }

    public record RankChangeEvent(RankTier from, RankTier to, boolean isPromotion) {
    }
}