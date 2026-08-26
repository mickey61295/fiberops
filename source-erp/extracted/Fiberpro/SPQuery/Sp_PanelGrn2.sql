/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/08/2022    

; Create By        :  ASLAM  

; Description      :  PANEL_Stock  

; Change Person    :  ASLAM

; Last Change Date :  01/06/2023 10.00 AM 

; =============================================  */  

  

CREATE PROCEDURE Sp_PanelGrn2 (@Id Int,@StyleId Int,@ColId Int,@PanelId Int,@SizID Int,@RecPcs int,@Styleno Varchar(20),@Partid Int ,@PanelGrp Varchar(500),@LotNo Varchar(15),@CompId Int) AS   BEGIN    Declare @Semifinish Char(1),@StageId int 

SELECT @StageId = TargetStageID from Trs_PcsGrn1 Where Id = @ID  

SELECT @Semifinish = ISNull(SemiFinish,'S') From Mas_Dept A INNER JOIN Mas_JobWrkComp B ON A.DeptID = B.DeptID Where B.ID = @StageId  



If (Select isnull(Count(ID), 0) from Trs_PcsGrn2 WHERE  id = @ID AND ColID = @ColID AND StyleID = @StyleID AND PanelID = @PanelID AND SizID = @SizID AND StyleNo = @StyleNo AND PartID = @PartID and LotNo=@LotNo and IsNull(CompId,0) = @CompId )=0 And @RecPcs>0    

BEGIN    

INSERT INTO Trs_PcsGrn2(ID,StyleID,ColID,PanelID,SizID,RecPcs,StyleNo,PartID,Panelgrp,LotNo,CompId) VALUES(@ID,@StyleID,@ColID,@PanelID, @SizID,@RecPcs,@StyleNo,@PartID,@Panelgrp,@LotNo,@CompId)    



if @Semifinish='S' 

begin 

Exec PROC_PanelReceipt_Insert @Id ,@StyleNo ,@ColID ,@PartId ,@SizId ,@RecPcs ,@LotNo  ,@CompId 

End  

END     

ELSE   

BEGIN    

IF (Select isnull(Count(ID), 0) from Trs_PcsGrn2 WHERE  id = @ID AND ColID = @ColID AND StyleID = @StyleID AND PanelID = @PanelID AND SizID = @SizID AND StyleNo = @StyleNo AND PartID = @PartID and @LotNo = @LotNo and IsNull(CompId,0) = @CompId )>0 And @RecPcs>0     

BEGIN    

if @Semifinish='S'  

begin  Exec PROC_PanelReceipt_Update @Id ,@StyleNo ,@ColID ,@PartId ,@SizId ,@RecPcs ,@LotNo ,@CompId

End 

Update Trs_PcsGrn2 set RecPcs = @RecPcs  Where id = @ID AND ColID = @ColID AND StyleID = @StyleID AND PanelID = @PanelID AND SizID = @SizID AND StyleNo = @StyleNo AND PartID = @PartID  And LotNo = @LotNo  and IsNull(CompId,0) = @CompId 

END   

ELSE  

BEGIN  

if @Semifinish='S'  

begin  

Exec PROC_PanelReceipt_Delete_1 @Id ,@StyleNo ,@PartId,@ColID ,@SizId ,@RecPcs ,@LotNo,@CompId 

end 

DELETE FROM Trs_PcsGrn2 WHERE id = @ID AND  ColID = @ColID AND StyleID = @StyleID AND PanelID = @PanelID AND SizID = @SizID AND StyleNo = @StyleNo AND PartID = @PartID  And LotNo = @LotNo   And @RecPcs = 0   and IsNull(CompId,0) = @CompId

END  

END 

END 




