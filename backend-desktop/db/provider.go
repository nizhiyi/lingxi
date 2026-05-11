package db

import "time"

// ─── Providers / API Profiles ────────────────────────────────────

type Provider struct {
	ID             int64  `json:"id"`
	Code           string `json:"code"`
	Name           string `json:"name"`
	Protocol       string `json:"protocol"`
	DefaultBaseURL string `json:"default_base_url"`
	DefaultModel   string `json:"default_model"`
	UsageAPIMeta   string `json:"usage_api_meta"`
	DocURL         string `json:"doc_url"`
	Builtin        bool   `json:"builtin"`
}

type APIProfile struct {
	ID               int64     `json:"id"`
	Name             string    `json:"name"`
	ProviderID       int64     `json:"provider_id"`
	ProviderCode     string    `json:"provider_code,omitempty"`
	ProviderName     string    `json:"provider_name,omitempty"`
	ProviderProtocol string    `json:"provider_protocol,omitempty"`
	BaseURL          string    `json:"base_url"`
	Model            string    `json:"model"`
	AuthTokenCipher  string    `json:"auth_token_cipher,omitempty"`
	AuthTokenMask    string    `json:"auth_token_mask"`
	Extra            string    `json:"extra"`
	Transformer      string    `json:"transformer"`
	IsActive         bool      `json:"is_active"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func ListProviders() ([]Provider, error) {
	rows, err := DB.Query(`SELECT id, code, name, protocol, default_base_url, default_model, usage_api_meta, doc_url, builtin
		FROM providers ORDER BY builtin DESC, id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]Provider, 0)
	for rows.Next() {
		var p Provider
		var builtin int
		if err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.Protocol, &p.DefaultBaseURL, &p.DefaultModel, &p.UsageAPIMeta, &p.DocURL, &builtin); err != nil {
			continue
		}
		p.Builtin = builtin == 1
		out = append(out, p)
	}
	return out, nil
}

func GetProvider(id int64) (*Provider, error) {
	var p Provider
	var builtin int
	err := DB.QueryRow(`SELECT id, code, name, protocol, default_base_url, default_model, usage_api_meta, doc_url, builtin
		FROM providers WHERE id=?`, id).
		Scan(&p.ID, &p.Code, &p.Name, &p.Protocol, &p.DefaultBaseURL, &p.DefaultModel, &p.UsageAPIMeta, &p.DocURL, &builtin)
	if err != nil {
		return nil, err
	}
	p.Builtin = builtin == 1
	return &p, nil
}

func ListAPIProfiles(includeCipher bool) ([]APIProfile, error) {
	rows, err := DB.Query(`
		SELECT p.id, p.name, p.provider_id, COALESCE(pr.code,''), COALESCE(pr.name,''), COALESCE(pr.protocol,'anthropic'),
		       p.base_url, p.model, p.auth_token_cipher, p.auth_token_mask, p.extra, p.transformer, p.is_active, p.created_at, p.updated_at
		FROM api_profiles p LEFT JOIN providers pr ON pr.id=p.provider_id
		ORDER BY p.is_active DESC, p.updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]APIProfile, 0)
	for rows.Next() {
		var ap APIProfile
		var active int
		if err := rows.Scan(&ap.ID, &ap.Name, &ap.ProviderID, &ap.ProviderCode, &ap.ProviderName, &ap.ProviderProtocol,
			&ap.BaseURL, &ap.Model, &ap.AuthTokenCipher, &ap.AuthTokenMask, &ap.Extra, &ap.Transformer, &active, &ap.CreatedAt, &ap.UpdatedAt); err != nil {
			continue
		}
		ap.IsActive = active == 1
		if !includeCipher {
			ap.AuthTokenCipher = ""
		}
		out = append(out, ap)
	}
	return out, nil
}

func GetAPIProfile(id int64, includeCipher bool) (*APIProfile, error) {
	var ap APIProfile
	var active int
	err := DB.QueryRow(`
		SELECT p.id, p.name, p.provider_id, COALESCE(pr.code,''), COALESCE(pr.name,''), COALESCE(pr.protocol,'anthropic'),
		       p.base_url, p.model, p.auth_token_cipher, p.auth_token_mask, p.extra, p.transformer, p.is_active, p.created_at, p.updated_at
		FROM api_profiles p LEFT JOIN providers pr ON pr.id=p.provider_id
		WHERE p.id=?`, id).
		Scan(&ap.ID, &ap.Name, &ap.ProviderID, &ap.ProviderCode, &ap.ProviderName, &ap.ProviderProtocol,
			&ap.BaseURL, &ap.Model, &ap.AuthTokenCipher, &ap.AuthTokenMask, &ap.Extra, &ap.Transformer, &active, &ap.CreatedAt, &ap.UpdatedAt)
	if err != nil {
		return nil, err
	}
	ap.IsActive = active == 1
	if !includeCipher {
		ap.AuthTokenCipher = ""
	}
	return &ap, nil
}

func GetActiveAPIProfile(includeCipher bool) (*APIProfile, error) {
	var id int64
	if err := DB.QueryRow(`SELECT id FROM api_profiles WHERE is_active=1 LIMIT 1`).Scan(&id); err != nil {
		return nil, err
	}
	return GetAPIProfile(id, includeCipher)
}

func UpsertAPIProfile(ap *APIProfile) (int64, error) {
	if ap.ID > 0 {
		_, err := DB.Exec(`
			UPDATE api_profiles SET
				name=?, provider_id=?, base_url=?, model=?,
				auth_token_cipher=?, auth_token_mask=?, extra=?, transformer=?, updated_at=CURRENT_TIMESTAMP
			WHERE id=?`,
			ap.Name, ap.ProviderID, ap.BaseURL, ap.Model,
			ap.AuthTokenCipher, ap.AuthTokenMask, ap.Extra, ap.Transformer, ap.ID)
		return ap.ID, err
	}
	res, err := DB.Exec(`
		INSERT INTO api_profiles (name, provider_id, base_url, model, auth_token_cipher, auth_token_mask, extra, transformer)
		VALUES (?,?,?,?,?,?,?,?)`,
		ap.Name, ap.ProviderID, ap.BaseURL, ap.Model, ap.AuthTokenCipher, ap.AuthTokenMask, ap.Extra, ap.Transformer)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func DeleteAPIProfile(id int64) error {
	_, err := DB.Exec(`DELETE FROM api_profiles WHERE id=?`, id)
	return err
}

func ActivateAPIProfile(id int64) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	if _, err := tx.Exec(`UPDATE api_profiles SET is_active=0`); err != nil {
		tx.Rollback()
		return err
	}
	if _, err := tx.Exec(`UPDATE api_profiles SET is_active=1, updated_at=CURRENT_TIMESTAMP WHERE id=?`, id); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}
