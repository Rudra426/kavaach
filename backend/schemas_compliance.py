from enum import Enum
from pydantic import BaseModel

class ConsentType(str, Enum):
    DATA_COLLECTION = "data_collection"
    PREMIUM_DEDUCTION = "premium_deduction"
    PARAMETRIC_PAYOUT = "parametric_payout"
    THIRD_PARTY_SHARE = "third_party_share"

class ConsentPayload(BaseModel):
    data_collection: bool
    premium_deduction: bool
    parametric_payout: bool
    third_party_share: bool

    def all_given(self) -> bool:
        return all([self.data_collection, self.premium_deduction, self.parametric_payout, self.third_party_share])
