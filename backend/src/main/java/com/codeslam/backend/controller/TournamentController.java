package com.codeslam.backend.controller;

import com.codeslam.backend.dto.CreateTournamentRequest;
import com.codeslam.backend.dto.TournamentDetailDto;
import com.codeslam.backend.dto.TournamentSummaryDto;
import com.codeslam.backend.entity.Tournament;
import com.codeslam.backend.entity.TournamentEntry;
import com.codeslam.backend.entity.User;
import com.codeslam.backend.repository.TournamentEntryRepository;
import com.codeslam.backend.repository.TournamentRepository;
import com.codeslam.backend.service.UserService;
import java.security.Principal;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tournaments")
public class TournamentController {

    private final TournamentRepository tournamentRepository;
    private final TournamentEntryRepository tournamentEntryRepository;
    private final UserService userService;

    public TournamentController(TournamentRepository tournamentRepository,
            TournamentEntryRepository tournamentEntryRepository,
            UserService userService) {
        this.tournamentRepository = tournamentRepository;
        this.tournamentEntryRepository = tournamentEntryRepository;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<TournamentDetailDto> createTournament(@RequestBody CreateTournamentRequest request,
            Principal principal) {
        if (request == null || request.getName() == null || request.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tournament name is required");
        }

        User organizer = userService.getById(principal.getName());
        Tournament tournament = Tournament.builder()
                .name(request.getName().trim())
                .organizer(organizer)
                .status("OPEN")
                .startDate(request.getStartDate())
                .eligibilityRules(request.getEligibilityRules())
                .maxParticipants(request.getMaxParticipants())
                .build();

        Tournament saved = tournamentRepository.save(tournament);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toDetailDto(saved, organizer.getId()));
    }

    @PostMapping("/{tournamentId}/register")
    public ResponseEntity<TournamentDetailDto> register(@PathVariable UUID tournamentId, Principal principal) {
        User user = userService.getById(principal.getName());
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tournament not found"));

        if (!"OPEN".equalsIgnoreCase(tournament.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tournament registration is closed");
        }

        if (Boolean.TRUE.equals(tournamentEntryRepository.existsByTournamentIdAndUserId(tournamentId, user.getId()))) {
            return ResponseEntity.ok(toDetailDto(tournament, user.getId()));
        }

        long entries = tournamentEntryRepository.countByTournamentId(tournamentId);
        if (tournament.getMaxParticipants() != null && entries >= tournament.getMaxParticipants()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tournament is full");
        }

        TournamentEntry entry = TournamentEntry.builder()
                .tournament(tournament)
                .user(user)
                .build();
        tournamentEntryRepository.save(entry);

        return ResponseEntity.ok(toDetailDto(tournament, user.getId()));
    }

    @GetMapping
    public ResponseEntity<List<TournamentSummaryDto>> listTournaments(Principal principal) {
        User user = userService.getById(principal.getName());
        List<TournamentSummaryDto> tournaments = tournamentRepository
                .findByStatusIgnoreCaseOrderByCreatedAtDesc("OPEN")
                .stream()
                .map(tournament -> toSummaryDto(tournament, user.getId()))
                .toList();
        return ResponseEntity.ok(tournaments);
    }

    @GetMapping("/{tournamentId}")
    public ResponseEntity<TournamentDetailDto> getTournament(@PathVariable UUID tournamentId, Principal principal) {
        User user = userService.getById(principal.getName());
        Tournament tournament = tournamentRepository.findById(tournamentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tournament not found"));
        return ResponseEntity.ok(toDetailDto(tournament, user.getId()));
    }

    @GetMapping("/active")
    public ResponseEntity<List<TournamentSummaryDto>> getActiveTournaments() {
        List<TournamentSummaryDto> tournaments = tournamentRepository
                .findTop5ByStatusIgnoreCaseOrderByStartDateDesc("ACTIVE")
                .stream()
                .map(tournament -> toSummaryDto(tournament, null))
                .toList();
        return ResponseEntity.ok(tournaments);
    }

    private TournamentSummaryDto toSummaryDto(Tournament tournament, UUID currentUserId) {
        Long entryCount = tournamentEntryRepository.countByTournamentId(tournament.getId());
        return TournamentSummaryDto.builder()
                .id(tournament.getId())
                .name(tournament.getName())
                .status(tournament.getStatus() == null ? null : tournament.getStatus().toUpperCase(Locale.ROOT))
                .startDate(tournament.getStartDate())
                .maxParticipants(tournament.getMaxParticipants())
                .prizeDescription(tournament.getPrizeDescription())
                .entryCount(entryCount)
                .build();
    }

    private TournamentDetailDto toDetailDto(Tournament tournament, UUID currentUserId) {
        Long entryCount = tournamentEntryRepository.countByTournamentId(tournament.getId());
        boolean registered = currentUserId != null
                && tournamentEntryRepository.existsByTournamentIdAndUserId(tournament.getId(), currentUserId);

        return TournamentDetailDto.builder()
                .id(tournament.getId())
                .name(tournament.getName())
                .status(tournament.getStatus() == null ? null : tournament.getStatus().toUpperCase(Locale.ROOT))
                .startDate(tournament.getStartDate())
                .maxParticipants(tournament.getMaxParticipants())
                .prizeDescription(tournament.getPrizeDescription())
                .eligibilityRules(tournament.getEligibilityRules())
                .organizerId(tournament.getOrganizer() == null ? null : tournament.getOrganizer().getId())
                .organizerUsername(tournament.getOrganizer() == null ? null : tournament.getOrganizer().getUsername())
                .entryCount(entryCount)
                .registered(registered)
                .build();
    }
}
