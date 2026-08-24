/*;=============================================   
; Author           :  Global Software's    
; Create date      :  19/01/2023    

; Create By        :  ASLAM  

; Description      :  PANEL_Stock  

; Change Person    :  ASLAM

; Last Change Date :  15/10/2025 10.30 AM 

; =============================================  */  

CREATE PROCEDURE PROC_PiecesReceipt_Delete_1 (@ID Int,@StyleNo Varchar(20),@PartId int,@ColId Int,@SizeId Int,@Pcs Int,@LotNo Varchar(15),@RewrkPcs int,@Rejpcs int) AS DECLARE @Ordid Int,@StageId Int,@GodId Int,@StockQty Int,@SourceStageId Int,@FinalStage


 Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@StageId1 Int,@GrnType varchar(20),@ProcessType Char(1),@RejectionTypeId Int ,@DCTargetStageId int ,@LotId int,@coycode int,@PanelId Int,@SemiFinishDept Varchar(1),@StockRewrkQty int,@StockRejQty int   ,@cutGrn  char(1)



 SELECT @cutGrn = IsNull(JobWrkCuttingGrn,'N') from Trs_PcsGrn1 where id=@id   



Select @Id=@ID    







Select @Coycode = Coycode FROM Trs_PcsGrn1 where id=@id       







select @Partyid = Party from Trs_PcsGrn1 where id=@id     







SELECT @Ordid = OrdJob from Trs_PcsGrn1 where id=@id     







SELECT @StyleNo = @StyleNo   







SELECT @Stageid = TargetStageID from Trs_PcsGrn1 where id=@id     







SELECT @PartId = @PartId   







SELECT @GodId = GodId from Trs_PcsGrn1 where id=@id   







SELECT @ProcessType = ProcessType from Trs_PcsGrn1 where id=@id     







SELECT @RejectionTypeId = Trs_Pcs1.RejectionTypeId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@id    







Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@Stageid    







SELECT @colid = @Colid   







SELECT @Sizeid = @Sizeid   







SELECT @StockQty = @Pcs   



SELECT @StockRewrkQty = @RewrkPcs   



SELECT @StockRejQty = @RejPcs   







SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_PcsGrn1 Inner Join Mas_JobWrkComp On Trs_PcsGrn1.TargetStageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.DeptId=Mas_Dept.DeptId Where Trs_PcsGrn1.Id=@Id     







Select @GrnType = GrnType from trs_pcsgrn1 where id=@id    







Select @SemiFinishDept=Mas_Dept.SEMIFINISH From Mas_Dept INNER JOIN Trs_PcsGrn1 ON Trs_PcsGrn1.Dept=Mas_Dept.DeptID Where Trs_PcsGrn1.ID=@Id     







If @SemiFinishDept='F'    







BEGIN  







SELECT @DCTargetStageId = Trs_Pcs1.TargetStageID from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And   Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And 







Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo Where Trs_PcsGrn1.id=@id   







END     







Else  







BEGIN   







SELECT @DCTargetStageId = Trs_Pcs1.TargetStageID from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join   trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo Where Trs_PcsGrn1.id=@id 







END      







BEGIN   







DECLARE LINE_CURSOR_DEL CURSOR FOR      







Select Id,StyleNo,Colid,PartId,SizId,IsNull(lotNo,'') LotNo,RecPcs,PanelID,isNull(ReWrkPcs,0) as ReWrkPcs,IsNull(RejPcs,0) as RejPcs FROM Trs_PcsGrn2 Where ID=@Id And StyleNo=@StyleNo and Colid =	 @ColId and PartId = @PartId And SizId =@SizeId  and LotNo 


=@LotNo 







OPEN 	 LINE_CURSOR_DEL  	  







FETCH NEXT FROM LINE_CURSOR_DEL INTO @Id,@StyleNo,@Colid,@PartId,@SizeId,@LotNo,@Pcs,@PanelId,@RewrkPcs,@RejPcs    	 







WHILE @@FETCH_STATUS = 0    	  







BEGIN   







if ltrim(@LotNo)<>'' 	 







SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo)	







else 	







 SELECT @LotId = 0   	    







If @GrnType='Process Return'   







BegiN   







If @SemiFinishDept='F'      







Select @StageId1 = Trs_Pcs1.TargetStageId from







 Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id 		 Inner Join trs_pcsgrn1 On Trs_Pcs1.Ordjobno=  Trs_PcsGrn1.OrdJob Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And   Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2


.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And 		 Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo Where Trs_PcsGrn1.id=@id  







Else  







Select @StageId1 = Trs_Pcs1.TargetStageId from Trs_Pcs2 Inner Join Trs_Pcs1 On Trs_Pcs2.Id=Trs_Pcs1.Id Inner Join trs_pcsgrn1 On Trs_Pcs2.Id=Trs_PcsGrn1.Ourdcref Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id And Trs_Pcs1.Ordjobno=  Trs_PcsGrn1.OrdJob And Trs_Pcs2.StyleNo=Trs_PcsGrn2.StyleNo And Trs_Pcs2.PartID=Trs_PcsGrn2.PARTID And Trs_Pcs2.ColID=Trs_PcsGrn2.ColID And Trs_Pcs2.lotNo = Trs_PcsGrn2.LotNo where Trs_PcsGrn1.id=@id   







End  







Else  







Begin  







SELECT @StageId1 = TargetStageId From Trs_PcsGrn1 Where Id=@Id  







End   







BEGIN   







If @FinalStage='S'  







Begin   







If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Piece'   OR (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Panel'  
Begin 	    







if @DCTargetStageId <> @StageId  







begin







if @ProcessType='R' 







begin  







UPDATE Pcs_StockTableQty    SET StockQty=Pcs_StockTableQty.StockQty+ @Pcs ,



Pcs_StockTableQty.RewrkStk=isNull(Pcs_StockTableQty.ReWrkStk,0) + @ReWrkPcs , Pcs_StockTableQty.RejStk=isNull(Pcs_StockTableQty.RejStk,0) + @RejPcs



From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=@DCTargetStageId And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id = Trs_PcsGrn2.Id And Pcs_StockTable.StyleNo=		Trs_PcsGrn2.StyleNo And Pcs_StockTable.PartId=Trs_PcsGrn2.PartId And Pcs_StockTableQty.ColId=Trs_PcsGrn2.ColId And Pcs_StockTableQty.SizeId=Trs_PcsGrn2.SizId And Pcs_StockTable.LotID = @LotId    		 WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=Trs_PcsGrn2.StyleNo and Pcs_StockTable.Stageid=@DCTargetStageId And Pcs_StockTable.PartId=Trs_PcsGrn2.PartId and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and Pcs_StockTableQty.Colid=Trs_PcsGrn2.ColId and Pcs_StockTableQty.SizeId=Trs_PcsGrn2.SizId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId and Partyid=Trs_PcsGrn1.Party And Trs_PcsGrn1.Id=@Id  AND Trs_PcsGrn2.SizId = @SizeId and 



Trs_PcsGrn2.ColId = @ColId And Trs_PcsGrn2.PartId = @PartId and Trs_PcsGrn2.StyleNo = @StyleNo   And ISNULL(Pcs_StockTable.EmpID,0) = 0

end  

else 

begin   

If @GrnType<>'Process Return'    

begin   

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs ,

Pcs_StockTableQty.RewrkStk=isNull(Pcs_StockTableQty.ReWrkStk,0) + @ReWrkPcs , Pcs_StockTableQty.RejStk=isNull(Pcs_StockTableQty.RejStk,0) + @RejPcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId 


Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=@DCTargetStageId And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId Inner Join Trs_PcsGrn2 On Trs_PcsGrn1.Id=Trs_PcsGrn2.Id


 And Pcs_StockTable.StyleNo=Trs_PcsGrn2.StyleNo And Pcs_StockTable.PartId=Trs_PcsGrn2.PartId And Pcs_StockTableQty.ColId=Trs_PcsGrn2.ColId And Pcs_StockTableQty.SizeId=Trs_PcsGrn2.SizId WHERE Pcs_StockTable.coycode= Trs_PcsGrn1.Coycode And Pcs_StockTable.


Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=Trs_PcsGrn2.StyleNo and Pcs_StockTable.Stageid=@DCTargetStageId And Pcs_StockTable.PartId=Trs_PcsGrn2.PartId and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and Pcs_StockTableQty.Colid=Trs_PcsGrn2.ColId and Pcs_StockTableQty.SizeId=Trs_PcsGrn2.SizId and 



Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotID  And Pcs_StockTable.PartId=@PartId and Pcs_StockTableQty.SizeId=@SizeId and Pcs_StockTableQty.Colid=@ColId  and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=Trs_PcsGrn1.Party And Trs_PcsGrn1.Id=@Id     And ISNULL(Pcs_StockTable.EmpID,0) = 0 

end   

end   

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@Pcs,ProductionQty=Pcs_StockTableQty.ProductionQty-@Pcs,



Pcs_StockTableQty.RewrkStk=isNull(Pcs_StockTableQty.ReWrkStk,0) - @ReWrkPcs , Pcs_StockTableQty.RejStk=isNull(Pcs_StockTableQty.RejStk,0) - @RejPcs

 From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=Trs_PcsGrn1.TargetStageId And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId And



 Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo and Pcs_StockTable.LotID =@LotID and Pcs_StockTable.Stageid=Trs_PcsGrn1.TargetStageid And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId And Pcs_StockTable.LotId = @LotID and IsNull(GoodPcsFlag,'G')='G' and IsNull(


RejectionTypeId,0)=0 and Partyid=0 And Trs_PcsGrn1.Id=@Id    And ISNULL(Pcs_StockTable.EmpID,0) = 0

End  

Else  

Begin  

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@Pcs,ProductionQty=Pcs_StockTableQty.ProductionQty-@Pcs ,

Pcs_StockTableQty.RewrkStk=isNull(Pcs_StockTableQty.ReWrkStk,0) - @ReWrkPcs , Pcs_StockTableQty.RejStk=isNull(Pcs_StockTableQty.RejStk,0) - @RejPcs 	

From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=Trs_PcsGrn1.TargetStageId And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And


	  Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo and Pcs_StockTable.LotID =@LotID  and Pcs_StockTable.Stageid=Trs_PcsGrn1.TargetStageid And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and 		  Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=0 And Trs_PcsGrn1.Id=@Id     And ISNULL(Pcs_StockTable.EmpID,0) = 0



if @cutGrn ='Y' and @Stageid = 1 and (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Piece'

 begin

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs,

Pcs_StockTableQty.RewrkStk=isNull(Pcs_StockTableQty.ReWrkStk,0) + @ReWrkPcs , Pcs_StockTableQty.RejStk=isNull(Pcs_StockTableQty.RejStk,0) + @RejPcs  From Pcs_StockTableQty Inner Join  Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.

OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=@StageId1 And Pcs_StockTable.GodId= Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo and Pcs_StockTable.LotID =@LotID And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE  Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo and Pcs_StockTable.LotID =@LotID and Pcs_StockTable.Stageid=@StageId1 And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=  Trs_PcsGrn1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id     And ISNULL(Pcs_StockTable.EmpID,0) = 0

END 



End  

End  

If @GrnType='Process Return'    

Begin   

UPDATE Pcs_StockTableQty SET StockQty= Pcs_StockTableQty.StockQty+@Pcs ,

Pcs_StockTableQty.RewrkStk=isNull(Pcs_StockTableQty.ReWrkStk,0) + @ReWrkPcs , Pcs_StockTableQty.RejStk=isNull(Pcs_StockTableQty.RejStk,0) + @RejPcs



 From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And

 Pcs_StockTable.StageId=@StageId1 And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId  And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and


 IsNull(RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo and Pcs_StockTable.Stageid=@StageId1 And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId And Pcs_StockTable.LotId = @LotID and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P
' Then 0 Else @RejectionTypeId End and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id       And ISNULL(Pcs_StockTable.EmpID,0) = 0

End   

Else   

If @StageId<>1   

Begin  

if @ProcessType='R' 

begin 

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs ,

Pcs_StockTableQty.RewrkStk=isNull(Pcs_StockTableQty.ReWrkStk,0) + @ReWrkPcs , Pcs_StockTableQty.RejStk=isNull(Pcs_StockTableQty.RejStk,0) + @RejPcs 

 From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=@StageId1 And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId 

WHERE Pcs_StockTable.coycode

=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo and Pcs_StockTable.LotID =@LotID and Pcs_StockTable.Stageid=@StageId1 And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId and   Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId And Pcs_StockTable.LotId = @LotID and IsNull(GoodPcsFlag,'G')='M' and IsNull(RejectionTypeId,0)=@RejectionTypeId and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id     And ISNULL(Pcs_StockTable.EmpID,0) = 0

end  

else  

begin  

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs,

Pcs_StockTableQty.RewrkStk=isNull(Pcs_StockTableQty.ReWrkStk,0) + @ReWrkPcs , Pcs_StockTableQty.RejStk=isNull(Pcs_StockTableQty.RejStk,0) + @RejPcs  From Pcs_StockTableQty Inner Join  Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.

OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=@StageId1 And Pcs_StockTable.GodId= Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo and Pcs_StockTable.LotID =@LotID And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE  Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo and Pcs_StockTable.LotID =@LotID and Pcs_StockTable.Stageid=@StageId1 And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=  Trs_PcsGrn1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id    And ISNULL(Pcs_StockTable.EmpID,0) = 0

end 

End  

End  

If @FinalStage='F'  

Begin  

If (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId1)='Piece' 
Begin 

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@Pcs,ProductionQty=Pcs_StockTableQty.ProductionQty-@Pcs ,



Pcs_StockTableQty.RewrkStk=isNull(Pcs_StockTableQty.ReWrkStk,0) - @ReWrkPcs , Pcs_StockTableQty.RejStk=isNull(Pcs_StockTableQty.RejStk,0) - @RejPcs



 From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob

 And Pcs_StockTable.StageId=Trs_PcsGrn1.TargetStageId And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo and Pcs_StockTable.LotID =@LotID And Pcs_StockTableQty.Colid=@ColId  And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo  =@StyleNo and Pcs_StockTable.LotID =@LotID and Pcs_StockTable.Stageid=Trs_PcsGrn1.TargetStageid and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTableQty.Colid=@ColId  and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=0 and Partyid=0 And Trs_PcsGrn1.Id=@Id    And ISNULL(Pcs_StockTable
.EmpID,0) = 0

End  

If @GrnType='Process Return'  

Begin   

UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@Pcs,



Pcs_StockTableQty.RewrkStk=isNull(Pcs_StockTableQty.ReWrkStk,0) - @ReWrkPcs , Pcs_StockTableQty.RejStk=isNull(Pcs_StockTableQty.RejStk,0) - @RejPcs 



 From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=@StageId1 And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTableQty.Colid=@ColId  And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G'

 and IsNull(RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.StyleNo=@StyleNo and Pcs_StockTable.LotID =@LotID and Pcs_StockTable.Stageid=@StageId1 and Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and  IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else 

@RejectionTypeId End and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id    And ISNULL(Pcs_StockTable.EmpID,0) = 0

End  

Else  

Begin  

If @StageId<>1  

Begin  

UPDATE  Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs ,



Pcs_StockTableQty.RewrkStk=isNull(Pcs_StockTableQty.ReWrkStk,0) + @ReWrkPcs , Pcs_StockTableQty.RejStk=isNull(Pcs_StockTableQty.RejStk,0) + @RejPcs  From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId

=Pcs_StockTableQty.PcsStockId Inner Join Trs_PcsGrn1 On Pcs_StockTable.Coycode=Trs_PcsGrn1.Coycode And  Pcs_StockTable.OrdId=Trs_PcsGrn1.Ordjob And Pcs_StockTable.StageId=@StageId1  And Pcs_StockTable.GodId=Trs_PcsGrn1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTableQty.Colid=@ColId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G'  and IsNull(RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_PcsGrn1.Coycode And Pcs_StockTable.Ordid=Trs_PcsGrn1.Ordjob and Pcs_StockTable.


StyleNo=@StyleNo and Pcs_StockTable.LotID =@LotID and Pcs_StockTable.Stageid=@StageId1 and Pcs_StockTable.GodId= Trs_PcsGrn1.GodId And Pcs_StockTableQty.Colid=@ColId  and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and  IsNull(RejectionTypeId,0)=0 and Partyid=@PartyId And Trs_PcsGrn1.Id=@Id    And ISNULL(Pcs_StockTable.EmpID,0) = 0

End   

End   

End  

END    

FETCH NEXT FROM LINE_CURSOR_DEL INTO @Id,@StyleNo,@Colid,@PartId,@SizeId,@LotNo,@Pcs,@PanelId ,@RewrkPcs,@RejPcs  

EnD 

CLOSE LINE_CURSOR_DEL   

DEALLOCATE LINE_CURSOR_DEL    

SET NOCOUNT OFF  

END 
